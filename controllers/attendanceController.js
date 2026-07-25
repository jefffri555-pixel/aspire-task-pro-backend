const db = require('../config/database');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

// In-memory fallback
const MOCK_ATTENDANCE = [];

/**
 * GET /api/attendance
 */
const getAttendance = async (req, res) => {
  const { date, userId } = req.query;

  if (isDbOffline()) {
    let list = [...MOCK_ATTENDANCE];
    if (date) list = list.filter(a => a.date === date);
    if (userId) list = list.filter(a => a.user_id === userId);
    return res.json(list);
  }

  try {
    let query = `
      SELECT a.*, u.name as employee_name, u.employee_id, d.name as department_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let count = 1;

    // Filter by role: staff can only see their own attendance logs
    if (req.user.role === 'staff') {
      query += ` AND a.user_id = $${count}`;
      params.push(req.user.id);
      count++;
    } else if (userId) {
      query += ` AND a.user_id = $${count}`;
      params.push(userId);
      count++;
    }

    if (date) {
      query += ` AND a.date = $${count}`;
      params.push(date);
      count++;
    }

    query += ` ORDER BY a.date DESC, a.check_in_time DESC`;

    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Attendance Error:', err);
    return res.status(500).json({ error: 'Internal server error listing attendance' });
  }
};

/**
 * GET /api/attendance/today
 * Check today's status for currently logged-in user
 */
const getTodayStatus = async (req, res) => {
  const userId = req.user.id;
  const todayStr = new Date().toISOString().split('T')[0];

  if (isDbOffline()) {
    const record = MOCK_ATTENDANCE.find(a => a.user_id === userId && a.date === todayStr);
    return res.json(record || null);
  }

  try {
    const query = `
      SELECT * FROM attendance 
      WHERE user_id = $1 AND date = CURRENT_DATE
    `;
    const result = await db.query(query, [userId]);
    return res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Get Today Status Error:', err);
    return res.status(500).json({ error: 'Internal server error checking today\'s attendance status' });
  }
};

/**
 * POST /api/attendance/mark
 * Mark clock-in or clock-out
 */
const markAttendance = async (req, res) => {
  const userId = req.user.id;
  const { action } = req.body; // 'clock_in' or 'clock_out'
  const todayStr = new Date().toISOString().split('T')[0];

  if (action !== 'clock_in' && action !== 'clock_out') {
    return res.status(400).json({ error: 'Action must be clock_in or clock_out' });
  }

  if (isDbOffline()) {
    let record = MOCK_ATTENDANCE.find(a => a.user_id === userId && a.date === todayStr);

    if (action === 'clock_in') {
      if (record) {
        return res.status(400).json({ error: 'Already clocked in today' });
      }
      record = {
        id: `att_${Date.now()}`,
        user_id: userId,
        employee_name: req.user.name,
        date: todayStr,
        status: 'present',
        check_in_time: new Date().toISOString(),
        check_out_time: null,
      };
      MOCK_ATTENDANCE.push(record);
      return res.status(201).json(record);
    } else {
      if (!record) {
        return res.status(400).json({ error: 'Cannot clock out without clocking in first' });
      }
      if (record.check_out_time) {
        return res.status(400).json({ error: 'Already clocked out today' });
      }
      record.check_out_time = new Date().toISOString();
      return res.json(record);
    }
  }

  try {
    if (action === 'clock_in') {
      // Check if already checked in today
      const checkRes = await db.query('SELECT id FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [userId]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ error: 'Already clocked in today' });
      }

      // Late check: after 09:30 AM is considered late
      const now = new Date();
      let status = 'present';
      if (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30)) {
        status = 'late';
      }

      const insertQuery = `
        INSERT INTO attendance (user_id, date, status, check_in_time)
        VALUES ($1, CURRENT_DATE, $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const result = await db.query(insertQuery, [userId, status]);
      return res.status(201).json(result.rows[0]);
    } else {
      // Clock out
      const checkRes = await db.query('SELECT id, check_out_time FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE', [userId]);
      if (checkRes.rows.length === 0) {
        return res.status(400).json({ error: 'Cannot clock out without clocking in first' });
      }
      if (checkRes.rows[0].check_out_time) {
        return res.status(400).json({ error: 'Already clocked out today' });
      }

      const updateQuery = `
        UPDATE attendance
        SET check_out_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND date = CURRENT_DATE
        RETURNING *
      `;
      const result = await db.query(updateQuery, [userId]);
      return res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Mark Attendance Error:', err);
    return res.status(500).json({ error: 'Internal server error marking attendance' });
  }
};

/**
 * PUT /api/attendance/:id
 * Admin updates attendance manually
 */
const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, check_in_time, check_out_time } = req.body;

  if (isDbOffline()) {
    const record = MOCK_ATTENDANCE.find(a => a.id === id);
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found in mock database' });
    }
    if (status) record.status = status;
    if (check_in_time) record.check_in_time = check_in_time;
    if (check_out_time) record.check_out_time = check_out_time;
    return res.json(record);
  }

  try {
    const checkRes = await db.query('SELECT * FROM attendance WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const existing = checkRes.rows[0];
    const finalStatus = status !== undefined ? status : existing.status;
    const finalCheckIn = check_in_time !== undefined ? check_in_time : existing.check_in_time;
    const finalCheckOut = check_out_time !== undefined ? check_out_time : existing.check_out_time;

    const query = `
      UPDATE attendance
      SET status = $1, check_in_time = $2, check_out_time = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const result = await db.query(query, [finalStatus, finalCheckIn, finalCheckOut, id]);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update Attendance Error:', err);
    return res.status(500).json({ error: 'Internal server error updating attendance' });
  }
};

module.exports = {
  getAttendance,
  getTodayStatus,
  markAttendance,
  updateAttendance
};
