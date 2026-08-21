const db = require('../config/database');
const { sendPushNotification } = require('../utils/pushNotification');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

exports.createRequest = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });

  const { date, correction_type, current_value, requested_value, reason } = req.body;
  const userId = req.user.id;
  const attachment_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Check for duplicate pending request
    const duplicateCheck = await db.query(
      `SELECT id FROM regularization_requests WHERE user_id = $1 AND date = $2 AND correction_type = $3 AND status = 'pending'`,
      [userId, date, correction_type]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'A pending request for this correction type and date already exists.' });
    }

    // Attempt to find attendance_id
    const attRes = await db.query(`SELECT id FROM attendance WHERE user_id = $1 AND date = $2`, [userId, date]);
    const attendance_id = attRes.rows.length > 0 ? attRes.rows[0].id : null;

    const insertQuery = `
      INSERT INTO regularization_requests 
        (user_id, attendance_id, date, correction_type, current_value, requested_value, reason, attachment_url, requested_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [
      userId, attendance_id, date, correction_type, current_value, requested_value, reason, attachment_url, userId
    ]);

    // Find Approver (Team Leader or Manager)
    const userRes = await db.query('SELECT name, team_leader_id, reporting_manager_id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      const approverId = u.team_leader_id || u.reporting_manager_id;
      if (approverId) {
        sendPushNotification(approverId, 'Attendance Correction Request', `${u.name} submitted a regularization request.`);
      }
    }

    res.status(201).json({ message: 'Request submitted successfully', request: result.rows[0] });
  } catch (err) {
    console.error('Create Regularization Request Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyRequests = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });
  try {
    const result = await db.query(
      `SELECT r.*, u.name as reviewer_name 
       FROM regularization_requests r 
       LEFT JOIN users u ON r.reviewed_by = u.id 
       WHERE r.user_id = $1 ORDER BY r.requested_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get My Requests Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllRequests = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });

  const role = req.user.role;
  const { status, employeeId, departmentId, startDate, endDate, type } = req.query;

  try {
    let query = `
      SELECT r.*, u.name as employee_name, u.employee_id, d.name as department_name, 
             a.name as reviewer_name
      FROM regularization_requests r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users a ON r.reviewed_by = a.id
      WHERE 1=1
    `;
    const params = [];
    let count = 1;

    if (status) { query += ` AND r.status = $${count++}`; params.push(status); }
    if (type) { query += ` AND r.correction_type = $${count++}`; params.push(type); }
    if (startDate) { query += ` AND r.date >= $${count++}`; params.push(startDate); }
    if (endDate) { query += ` AND r.date <= $${count++}`; params.push(endDate); }

    // Role-based visibility
    if (role === 'team_leader') {
      query += ` AND (r.user_id = $${count} OR u.team_leader_id = $${count})`;
      params.push(req.user.id);
      count++;
    } else if (role === 'manager') {
      if (departmentId) {
        query += ` AND u.department_id = $${count++}`;
        params.push(departmentId);
      } else {
        query += ` AND (r.user_id = $${count} OR u.department_id = $${count + 1})`;
        params.push(req.user.id, req.user.department_id);
        count += 2;
      }
    } else if (role === 'admin' || role === 'super_admin') {
      if (departmentId) { query += ` AND u.department_id = $${count++}`; params.push(departmentId); }
      if (employeeId) { query += ` AND r.user_id = $${count++}`; params.push(employeeId); }
    }

    query += ' ORDER BY r.requested_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get All Requests Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateStatus = async (req, res) => {
  if (isDbOffline()) return res.status(503).json({ error: 'Database is offline' });

  const { id } = req.params;
  const { status, remarks } = req.body;
  const reviewerId = req.user.id;

  if (!['approved', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const reqRes = await db.query('SELECT * FROM regularization_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const regReq = reqRes.rows[0];

    if (regReq.user_id === reviewerId && status !== 'cancelled') {
      return res.status(403).json({ error: 'You cannot approve or reject your own request' });
    }

    // Update Request
    await db.query(`
      UPDATE regularization_requests 
      SET status = $1, reviewed_by = $2, remarks = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [status, reviewerId, remarks, id]);

    // Apply Approval Changes to Attendance
    if (status === 'approved') {
      // Basic Upsert to make sure row exists if it was a missing punch in completely
      await db.query(`
        INSERT INTO attendance (user_id, date) 
        VALUES ($1, $2) ON CONFLICT (user_id, date) DO NOTHING
      `, [regReq.user_id, regReq.date]);

      // Depending on correction type, update the attendance table
      let updateCol = null;
      if (regReq.correction_type === 'Add Missing Punch In' || regReq.correction_type === 'Edit Punch In Time') {
        updateCol = 'check_in_time';
      } else if (regReq.correction_type === 'Add Missing Punch Out' || regReq.correction_type === 'Edit Punch Out Time') {
        updateCol = 'check_out_time';
      } else if (regReq.correction_type === 'Correct Attendance Status') {
        updateCol = 'status';
      }

      if (updateCol) {
        await db.query(`UPDATE attendance SET ${updateCol} = $1 WHERE user_id = $2 AND date = $3`, 
          [regReq.requested_value, regReq.user_id, regReq.date]
        );
      }
    }

    // Notification
    if (status === 'approved' || status === 'rejected') {
      const formattedDate = new Date(regReq.date).toLocaleDateString();
      sendPushNotification(regReq.user_id, 
        \`Attendance Correction \${status === 'approved' ? 'Approved' : 'Rejected'}\`, 
        \`Your attendance correction for \${formattedDate} has been \${status}.\`
      );
    }

    res.json({ message: \`Request \${status} successfully\` });
  } catch (err) {
    console.error('Review Request Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
