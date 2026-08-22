const db = require('../config/database');
const { sendPushNotification } = require('../utils/pushNotification');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

/**
 * POST /api/leaves
 * Create a new leave/WFH/On Duty request
 */
const createRequest = async (req, res) => {
  if (isDbOffline()) {
    return res.status(503).json({ error: 'Database is offline' });
  }

  const {
    leave_type,
    start_date,
    end_date,
    reason,
    duration_type = 'full_day',
    location,
    purpose,
    attachment_url
  } = req.body;
  const userId = req.user.id;

  try {
    // 1. Insert Request
    const insertQuery = `
      INSERT INTO leave_requests 
        (user_id, leave_type, start_date, end_date, status, reason, duration_type, location, purpose, attachment_url)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [
      userId, leave_type, start_date, end_date, reason, duration_type, location, purpose, attachment_url
    ]);
    const newRequest = result.rows[0];

    // 2. Find Approver (Team Leader or Manager)
    const userRes = await db.query('SELECT name, team_leader_id, reporting_manager_id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      const approverId = u.team_leader_id || u.reporting_manager_id;
      if (approverId) {
        sendPushNotification(approverId, 'New Attendance Request', `${u.name} submitted a ${leave_type} request.`);
      }
    }

    return res.status(201).json({ message: 'Request created successfully', request: newRequest });
  } catch (err) {
    console.error('Create Request Error:', err);
    return res.status(500).json({ error: 'Internal server error creating request' });
  }
};

/**
 * GET /api/leaves
 * Get leave/WFH/On Duty requests based on role
 */
const getRequests = async (req, res) => {
  if (isDbOffline()) {
    return res.status(503).json({ error: 'Database is offline' });
  }

  const { status, type, userId, departmentId, startDate, endDate } = req.query;
  const role = req.user.role;

  try {
    let query = `
      SELECT l.*, u.name as employee_name, u.employee_id, d.name as department_name, 
             a.name as approved_by_name
      FROM leave_requests l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users a ON l.approved_by = a.id
      WHERE 1=1
    `;
    const params = [];
    let count = 1;

    // Filters
    if (status) {
      query += ` AND l.status = $${count++}`;
      params.push(status);
    }
    if (type) {
      query += ` AND l.leave_type = $${count++}`;
      params.push(type);
    }
    if (startDate) {
      query += ` AND l.start_date >= $${count++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND l.end_date <= $${count++}`;
      params.push(endDate);
    }

    // Role-based visibility
    if (role === 'staff') {
      // Staff only sees their own
      query += ` AND l.user_id = $${count++}`;
      params.push(req.user.id);
    } else if (role === 'team_leader') {
      // TL sees own + their team
      if (userId && userId !== req.user.id) {
        query += ` AND l.user_id = $${count++}`;
        params.push(userId);
      } else {
        query += ` AND (l.user_id = $${count} OR u.team_leader_id = $${count})`;
        params.push(req.user.id);
        count++;
      }
    } else if (role === 'manager') {
      // Manager sees own + their department
      if (departmentId) {
        query += ` AND u.department_id = $${count++}`;
        params.push(departmentId);
      } else if (userId) {
        query += ` AND l.user_id = $${count++}`;
        params.push(userId);
      } else {
        query += ` AND (l.user_id = $${count} OR u.department_id = $${count + 1})`;
        params.push(req.user.id, req.user.department_id);
        count += 2;
      }
    } else {
      // Admin sees all
      if (departmentId) {
        query += ` AND u.department_id = $${count++}`;
        params.push(departmentId);
      }
      if (userId) {
        query += ` AND l.user_id = $${count++}`;
        params.push(userId);
      }
    }

    query += ' ORDER BY l.created_at DESC';
    
    const result = await db.query(query, params);

    // Fetch Audits for the returned requests
    const requestIds = result.rows.map(r => r.id);
    if (requestIds.length > 0) {
      const auditsRes = await db.query(`
        SELECT a.*, u.name as reviewer_name
        FROM leave_request_audits a
        JOIN users u ON a.reviewed_by = u.id
        WHERE a.leave_request_id = ANY($1)
        ORDER BY a.created_at ASC
      `, [requestIds]);
      
      const auditsByRequestId = {};
      auditsRes.rows.forEach(audit => {
        if (!auditsByRequestId[audit.leave_request_id]) {
          auditsByRequestId[audit.leave_request_id] = [];
        }
        auditsByRequestId[audit.leave_request_id].push(audit);
      });

      result.rows.forEach(row => {
        row.audits = auditsByRequestId[row.id] || [];
      });
    }

    return res.json(result.rows);
  } catch (err) {
    console.error('Get Requests Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching requests' });
  }
};

/**
 * PUT /api/leaves/:id/review
 * Approve or Reject a request
 */
const reviewRequest = async (req, res) => {
  if (isDbOffline()) {
    return res.status(503).json({ error: 'Database is offline' });
  }

  const { id } = req.params;
  const { status, remarks } = req.body;
  const reviewerId = req.user.id;

  if (!['approved', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // 1. Get request
    const reqRes = await db.query('SELECT user_id, leave_type, start_date, end_date FROM leave_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const leaveReq = reqRes.rows[0];

    if (leaveReq.user_id === reviewerId && status !== 'cancelled') {
      return res.status(403).json({ error: 'You cannot approve or reject your own request' });
    }

    // 2. Update status
    await db.query(`
      UPDATE leave_requests 
      SET status = $1, approved_by = $2, admin_notes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [status, reviewerId, remarks, id]);

    // 3. Create Audit Trail
    await db.query(`
      INSERT INTO leave_request_audits (leave_request_id, reviewed_by, status, remarks)
      VALUES ($1, $2, $3, $4)
    `, [id, reviewerId, status, remarks]);

    // 4. Notification
    if (status === 'approved' || status === 'rejected') {
      const title = status === 'approved' ? 'Request Approved' : 'Request Rejected';
      const formattedDate = new Date(leaveReq.start_date).toLocaleDateString();
      const body = `Your ${leaveReq.leave_type} request for ${formattedDate} has been ${status}.`;
      sendPushNotification(leaveReq.user_id, title, body);
    }

    // 5. Automatic Attendance Integration for Approvals
    if (status === 'approved') {
      const attStatus = leaveReq.leave_type === 'WFH' ? 'Work From Home' : 
                        leaveReq.leave_type === 'On Duty' ? 'On Duty' : 'Leave';
      
      // Upsert attendance for the date range
      const start = new Date(leaveReq.start_date);
      const end = new Date(leaveReq.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        await db.query(`
          INSERT INTO attendance (user_id, date, status, reason)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, date) DO UPDATE 
          SET status = $3, reason = $4
        `, [leaveReq.user_id, dateStr, attStatus, `Approved ${attStatus}`]);
      }
    }

    return res.json({ message: `Request ${status} successfully` });
  } catch (err) {
    console.error('Review Request Error:', err);
    return res.status(500).json({ error: 'Internal server error reviewing request' });
  }
};

module.exports = {
  createRequest,
  getRequests,
  reviewRequest
};
