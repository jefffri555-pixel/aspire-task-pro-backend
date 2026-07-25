const db = require('../config/database');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

// In-memory fallback
const MOCK_LEAVES = [];

/**
 * GET /api/leaves
 */
const getLeaves = async (req, res) => {
  const { status } = req.query;

  if (isDbOffline()) {
    let list = [...MOCK_LEAVES];
    if (req.user.role === 'staff') {
      list = list.filter(l => l.user_id === req.user.id);
    }
    if (status) {
      list = list.filter(l => l.status === status);
    }
    return res.json(list);
  }

  try {
    let query = `
      SELECT l.*, u.name as employee_name, u.employee_id, d.name as department_name
      FROM leave_requests l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let count = 1;

    if (req.user.role === 'staff') {
      query += ` AND l.user_id = $${count}`;
      params.push(req.user.id);
      count++;
    }

    if (status) {
      query += ` AND l.status = $${count}`;
      params.push(status);
      count++;
    }

    query += ` ORDER BY l.created_at DESC`;

    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Leaves Error:', err);
    return res.status(500).json({ error: 'Internal server error listing leaves' });
  }
};

/**
 * POST /api/leaves
 * Create a new leave request
 */
const createLeaveRequest = async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  const userId = req.user.id;

  if (!leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
  }

  if (isDbOffline()) {
    const newLeave = {
      id: `leave_${Date.now()}`,
      user_id: userId,
      employee_name: req.user.name,
      leave_type,
      start_date,
      end_date,
      status: 'pending',
      reason: reason || '',
      admin_notes: null,
      created_at: new Date().toISOString()
    };
    MOCK_LEAVES.push(newLeave);
    return res.status(201).json(newLeave);
  }

  try {
    const query = `
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [userId, leave_type, start_date, end_date, reason || '']);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create Leave Request Error:', err);
    return res.status(500).json({ error: 'Internal server error creating leave request' });
  }
};

/**
 * PUT /api/leaves/:id
 * Admin updates or approves/rejects a leave request
 */
const updateLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid leave status' });
  }

  if (isDbOffline()) {
    const leave = MOCK_LEAVES.find(l => l.id === id);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found in mock database' });
    }
    leave.status = status;
    if (admin_notes !== undefined) leave.admin_notes = admin_notes;
    return res.json(leave);
  }

  try {
    const checkRes = await db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const query = `
      UPDATE leave_requests
      SET status = $1, admin_notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(query, [status, admin_notes || null, id]);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update Leave Request Error:', err);
    return res.status(500).json({ error: 'Internal server error updating leave request' });
  }
};

module.exports = {
  getLeaves,
  createLeaveRequest,
  updateLeaveRequest
};
