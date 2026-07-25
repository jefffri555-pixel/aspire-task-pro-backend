const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * List all users with visibility constraints
 * - Manager: Can see all employees
 * - Team Leader: Can see employees in their department or reporting to them
 * - Staff: Can see their own profile and list team leaders / managers
 */
const getUsers = async (req, res) => {
  const { role, id, department_id } = req.user;

  try {
    let query = `
      SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.designation,
             u.joining_date, u.performance_score, d.name AS department_name,
             m.name AS reporting_manager_name, tl.name AS team_leader_name,
             u.reporting_manager_id, u.team_leader_id, u.department_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.reporting_manager_id = m.id
      LEFT JOIN users tl ON u.team_leader_id = tl.id
    `;
    const params = [];

    if (role === 'team_leader') {
      query += ` WHERE u.team_leader_id = $1 OR u.reporting_manager_id = $1 OR u.id = $1 OR u.department_id = $2`;
      params.push(id, department_id);
    } else if (role === 'staff') {
      // Staff see themselves, or a public directory of TLs / Managers they report to
      query += ` WHERE u.id = $1 OR u.role IN ('manager', 'team_leader')`;
      params.push(id);
    }

    query += ` ORDER BY u.name ASC`;

    const usersRes = await db.query(query, params);
    return res.json(usersRes.rows);
  } catch (err) {
    console.error('Get Users Error:', err);
    return res.status(500).json({ error: 'Internal server error listing employees' });
  }
};

/**
 * Get details of a single user
 */
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.designation,
             u.joining_date, u.performance_score, d.name AS department_name,
             m.name AS reporting_manager_name, tl.name AS team_leader_name,
             u.reporting_manager_id, u.team_leader_id, u.department_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.reporting_manager_id = m.id
      LEFT JOIN users tl ON u.team_leader_id = tl.id
      WHERE u.id = $1
    `;
    const userRes = await db.query(query, [id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(userRes.rows[0]);
  } catch (err) {
    console.error('Get User ID Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching employee profile' });
  }
};

/**
 * Create a new user employee profile (Manager only)
 */
const createUser = async (req, res) => {
  const {
    name, email, phone, password, role, designation,
    department_id, joining_date, reporting_manager_id, team_leader_id
  } = req.body;

  if (!name || !email || !phone || !role || !designation) {
    return res.status(400).json({ error: 'Name, email, phone, role, and designation are required fields' });
  }

  try {
    // Generate sequential Employee ID
    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const nextNum = parseInt(countRes.rows[0].count) + 1001;
    const employee_id = `EMP-${nextNum}`;

    // Hash Password (default to password123 if not set)
    const rawPass = password || 'password123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(rawPass, salt);

    const insertQuery = `
      INSERT INTO users (
        employee_id, name, email, phone, password_hash, role, designation,
        department_id, joining_date, reporting_manager_id, team_leader_id, performance_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 100.00)
      RETURNING id, employee_id, name, email, role, designation
    `;

    const values = [
      employee_id, name, email, phone, password_hash, role, designation,
      department_id || null, joining_date || new Date(),
      reporting_manager_id || null, team_leader_id || null
    ];

    const result = await db.query(insertQuery, values);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create User Error:', err);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'An employee with this email or phone number already exists' });
    }
    return res.status(500).json({ error: 'Internal server error creating employee user' });
  }
};

/**
 * Edit employee user profile (Manager only, or user updating their own contact profile)
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const loggedInUser = req.user;

  // Non-managers can only edit their own profiles
  if (loggedInUser.role !== 'manager' && loggedInUser.id !== id) {
    return res.status(403).json({ error: 'Access Denied. You can only edit your own details.' });
  }

  const {
    name, email, phone, password, role, designation,
    department_id, joining_date, reporting_manager_id, team_leader_id, performance_score
  } = req.body;

  try {
    // Check if user exists
    const checkUser = await db.query('SELECT id, password_hash FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    let passwordHash = checkUser.rows[0].password_hash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    let updateQuery;
    let values;

    if (loggedInUser.role === 'manager') {
      // Managers can change roles, score, designations, managers
      updateQuery = `
        UPDATE users
        SET name = $1, email = $2, phone = $3, password_hash = $4, role = $5, designation = $6,
            department_id = $7, joining_date = $8, reporting_manager_id = $9, team_leader_id = $10,
            performance_score = $11, updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING id, employee_id, name, email, role, designation, performance_score
      `;
      values = [
        name, email, phone, passwordHash, role, designation,
        department_id || null, joining_date || new Date(),
        reporting_manager_id || null, team_leader_id || null,
        performance_score !== undefined ? parseFloat(performance_score) : 100.00,
        id
      ];
    } else {
      // Non-managers can only update their name, email, phone, password
      updateQuery = `
        UPDATE users
        SET name = $1, email = $2, phone = $3, password_hash = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, employee_id, name, email, role, designation
      `;
      values = [
        name, email, phone, passwordHash, id
      ];
    }

    const result = await db.query(updateQuery, values);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update User Error:', err);
    return res.status(500).json({ error: 'Internal server error updating employee details' });
  }
};

/**
 * Remove employee profile (Manager only)
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own logged-in account' });
  }

  try {
    const checkRes = await db.query('SELECT name FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ message: `Successfully deleted employee: ${checkRes.rows[0].name}` });
  } catch (err) {
    console.error('Delete User Error:', err);
    return res.status(500).json({ error: 'Internal server error deleting employee' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
