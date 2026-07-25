const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { MOCK_USERS } = require('../utils/mockUsers');

// Helper to check database connection status
const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

/**
 * GET /api/admin/users
 * List all users across the system
 */
const getUsers = async (req, res) => {
  if (isDbOffline()) {
    const list = Object.values(MOCK_USERS).map(u => {
      const copy = { ...u };
      delete copy.password_plain;
      return copy;
    });
    return res.json(list);
  }

  try {
    const query = `
      SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.designation,
             u.joining_date, u.performance_score, d.name AS department_name,
             m.name AS reporting_manager_name, tl.name AS team_leader_name,
             u.reporting_manager_id, u.team_leader_id, u.department_id,
             u.status, u.profile_image
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.reporting_manager_id = m.id
      LEFT JOIN users tl ON u.team_leader_id = tl.id
      ORDER BY u.name ASC
    `;
    const result = await db.query(query);
    return res.json(result.rows);
  } catch (err) {
    console.error('Admin Get Users Error:', err);
    return res.status(500).json({ error: 'Internal server error listing users' });
  }
};

/**
 * GET /api/admin/users/:id
 * Retrieve details for a specific user
 */
const getUserById = async (req, res) => {
  const { id } = req.params;

  if (isDbOffline()) {
    const user = Object.values(MOCK_USERS).find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User not found in mock database' });
    }
    const copy = { ...user };
    delete copy.password_plain;
    return res.json(copy);
  }

  try {
    const query = `
      SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.designation,
             u.joining_date, u.performance_score, d.name AS department_name,
             m.name AS reporting_manager_name, tl.name AS team_leader_name,
             u.reporting_manager_id, u.team_leader_id, u.department_id,
             u.status, u.profile_image
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.reporting_manager_id = m.id
      LEFT JOIN users tl ON u.team_leader_id = tl.id
      WHERE u.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin Get User ID Error:', err);
    return res.status(500).json({ error: 'Internal server error retrieving user details' });
  }
};

/**
 * POST /api/admin/users
 * Create a new user account (any role)
 */
const createUser = async (req, res) => {
  const {
    name, email, phone, password, role, designation,
    department_id, joining_date, reporting_manager_id, team_leader_id,
    status, profile_image
  } = req.body;

  if (!name || !email || !phone || !role || !designation) {
    return res.status(400).json({ error: 'Name, email, phone, role, and designation are required fields' });
  }

  const validRoles = ['admin', 'manager', 'team_leader', 'staff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  const rawPassword = password || 'password123';

  if (isDbOffline()) {
    const emailKey = email.toLowerCase().trim();
    if (MOCK_USERS[emailKey]) {
      return res.status(400).json({ error: 'A mock employee with this email already exists' });
    }
    const newId = `mock_${Date.now()}`;
    const employee_id = `EMP-${1000 + Object.keys(MOCK_USERS).length + 1}`;
    
    const newUser = {
      id: newId,
      employee_id,
      name,
      email,
      phone,
      role,
      designation,
      department_id: department_id || 'dept_admin',
      department_name: department_id === 'dept_sales' ? 'Sales & Marketing' : 'Finance & Administration',
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      reporting_manager_id: reporting_manager_id || null,
      team_leader_id: team_leader_id || null,
      performance_score: 100.00,
      password_plain: rawPassword,
      status: status || 'active',
      profile_image: profile_image || null
    };

    MOCK_USERS[emailKey] = newUser;
    return res.status(201).json(newUser);
  }

  try {
    // Generate sequential Employee ID
    const countRes = await db.query('SELECT COUNT(*) FROM users');
    const nextNum = parseInt(countRes.rows[0].count) + 1001;
    const employee_id = `EMP-${nextNum}`;

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(rawPassword, salt);

    const insertQuery = `
      INSERT INTO users (
        employee_id, name, email, phone, password_hash, role, designation,
        department_id, joining_date, reporting_manager_id, team_leader_id, performance_score,
        status, profile_image
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 100.00, $12, $13)
      RETURNING id, employee_id, name, email, role, designation, status, profile_image
    `;

    const values = [
      employee_id, name, email, phone, password_hash, role, designation,
      department_id || null, joining_date || new Date(),
      reporting_manager_id || null, team_leader_id || null,
      status || 'active', profile_image || null
    ];

    const result = await db.query(insertQuery, values);
    const createdUser = result.rows[0];
    await logNotification(createdUser.id, 'New User Account Created', `Employee ${createdUser.name} (${createdUser.role}) has been registered with ID ${createdUser.employee_id}.`, 'new_user');
    return res.status(201).json(createdUser);
  } catch (err) {
    console.error('Admin Create User Error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A user with this email or phone number already exists' });
    }
    return res.status(500).json({ error: 'Internal server error creating user account' });
  }
};

/**
 * PUT /api/admin/users/:id
 * Modify user details (including changing roles and performance ranks)
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    name, email, phone, password, role, designation,
    department_id, joining_date, reporting_manager_id, team_leader_id, performance_score,
    status, profile_image
  } = req.body;

  if (isDbOffline()) {
    const userKey = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    if (!userKey) {
      return res.status(404).json({ error: 'User not found in mock database' });
    }
    const user = MOCK_USERS[userKey];
    
    if (name) user.name = name;
    if (email) {
      delete MOCK_USERS[userKey];
      user.email = email;
      MOCK_USERS[email.toLowerCase().trim()] = user;
    }
    if (phone) user.phone = phone;
    if (password) user.password_plain = password;
    if (role) user.role = role;
    if (designation) user.designation = designation;
    if (department_id) user.department_id = department_id;
    if (joining_date) user.joining_date = joining_date;
    if (reporting_manager_id) user.reporting_manager_id = reporting_manager_id;
    if (team_leader_id) user.team_leader_id = team_leader_id;
    if (performance_score !== undefined) user.performance_score = parseFloat(performance_score);
    if (status) user.status = status;
    if (profile_image !== undefined) user.profile_image = profile_image;

    const copy = { ...user };
    delete copy.password_plain;
    return res.json(copy);
  }

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = checkUser.rows[0];

    let passwordHash = existing.password_hash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const finalName = name !== undefined ? name : existing.name;
    const finalEmail = email !== undefined ? email : existing.email;
    const finalPhone = phone !== undefined ? phone : existing.phone;
    const finalRole = role !== undefined ? role : existing.role;
    const finalDesignation = designation !== undefined ? designation : existing.designation;
    const finalDept = department_id !== undefined ? department_id : existing.department_id;
    const finalJoinDate = joining_date !== undefined ? joining_date : existing.joining_date;
    const finalRepMgr = reporting_manager_id !== undefined ? reporting_manager_id : existing.reporting_manager_id;
    const finalTL = team_leader_id !== undefined ? team_leader_id : existing.team_leader_id;
    const finalScore = performance_score !== undefined ? parseFloat(performance_score) : existing.performance_score;
    const finalStatus = status !== undefined ? status : existing.status;
    const finalProfileImage = profile_image !== undefined ? profile_image : existing.profile_image;

    const updateQuery = `
      UPDATE users
      SET name = $1, email = $2, phone = $3, password_hash = $4, role = $5, designation = $6,
          department_id = $7, joining_date = $8, reporting_manager_id = $9, team_leader_id = $10,
          performance_score = $11, status = $12, profile_image = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING id, employee_id, name, email, role, designation, performance_score, status, profile_image
    `;

    const values = [
      finalName,
      finalEmail,
      finalPhone,
      passwordHash,
      finalRole,
      finalDesignation,
      finalDept,
      finalJoinDate,
      finalRepMgr,
      finalTL,
      finalScore,
      finalStatus,
      finalProfileImage,
      id
    ];

    const result = await db.query(updateQuery, values);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin Update User Error:', err);
    return res.status(500).json({ error: 'Internal server error updating user account' });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Remove user from system (Admins cannot delete themselves)
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own logged-in account' });
  }

  if (isDbOffline()) {
    const userKey = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    if (!userKey) {
      return res.status(404).json({ error: 'User not found in mock database' });
    }
    const name = MOCK_USERS[userKey].name;
    delete MOCK_USERS[userKey];
    return res.json({ message: `Successfully deleted employee: ${name}` });
  }

  try {
    const checkRes = await db.query('SELECT name FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ message: `Successfully deleted employee: ${checkRes.rows[0].name}` });
  } catch (err) {
    console.error('Admin Delete User Error:', err);
    return res.status(500).json({ error: 'Internal server error deleting user' });
  }
};

/**
 * POST /api/admin/reset-password
 * Reset any user's password
 */
const resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'userId and newPassword are required fields' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  if (isDbOffline()) {
    const user = Object.values(MOCK_USERS).find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found in mock database' });
    }
    user.password_plain = newPassword;
    return res.json({ message: 'Password reset successful (Mock Mode)' });
  }

  try {
    const checkUser = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, userId]);
    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Admin Reset Password Error:', err);
    return res.status(500).json({ error: 'Internal server error resetting password' });
  }
};

/**
 * GET /api/admin/dashboard
 * Fetch high-level statistics for Admin view
 */
const getDashboard = async (req, res) => {
  if (isDbOffline()) {
    const mockUsersCount = Object.keys(MOCK_USERS).length;
    return res.json({
      role: 'admin',
      totals: {
        users: mockUsersCount,
        projects: 3,
        tasks: 4,
        leads: 3,
        departments: 4
      },
      recentUsers: Object.values(MOCK_USERS).slice(0, 5).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        designation: u.designation
      }))
    });
  }

  try {
    const totalsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM projects) as projects,
        (SELECT COUNT(*) FROM tasks) as tasks,
        (SELECT COUNT(*) FROM leads) as leads,
        (SELECT COUNT(*) FROM departments) as departments
    `);

    const recentUsersRes = await db.query(`
      SELECT id, name, email, role, designation, employee_id
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const totals = totalsRes.rows[0];

    return res.json({
      role: 'admin',
      totals: {
        users: parseInt(totals.users) || 0,
        projects: parseInt(totals.projects) || 0,
        tasks: parseInt(totals.tasks) || 0,
        leads: parseInt(totals.leads) || 0,
        departments: parseInt(totals.departments) || 0
      },
      recentUsers: recentUsersRes.rows
    });
  } catch (err) {
    console.error('Admin Dashboard Fetch Error:', err);
    return res.status(500).json({ error: 'Internal server error calculating dashboard metrics' });
  }
};

/**
 * GET /api/admin/statistics
 * Fetch detailed breakdowns of tasks, departments, and metrics
 */
const getStatistics = async (req, res) => {
  if (isDbOffline()) {
    return res.json({
      taskStatusStats: [
        { status: 'pending', count: 1 },
        { status: 'in_progress', count: 1 },
        { status: 'waiting_for_review', count: 1 },
        { status: 'completed', count: 1 }
      ],
      leadStatusStats: [
        { status: 'new_lead', count: 1 },
        { status: 'follow_up', count: 1 },
        { status: 'booking_confirmed', count: 1 }
      ],
      departmentStats: [
        { department_name: 'Sales & Marketing', user_count: 2, project_count: 1 },
        { department_name: 'Operations & Bookings', user_count: 1, project_count: 1 },
        { department_name: 'Finance & Administration', user_count: 2, project_count: 1 }
      ],
      topPerformers: [
        { name: 'Vikram Malhotra', designation: 'General Manager', performance_score: 98.50 },
        { name: 'Anjali Sharma', designation: 'Sales Team Leader', performance_score: 92.00 },
        { name: 'Rohan Das', designation: 'Senior Sales Executive', performance_score: 88.00 }
      ]
    });
  }

  try {
    const taskStatusRes = await db.query('SELECT status, COUNT(*) as count FROM tasks GROUP BY status');
    const leadStatusRes = await db.query('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
    
    const departmentStatsRes = await db.query(`
      SELECT d.name as department_name, 
             COUNT(DISTINCT u.id) as user_count,
             COUNT(DISTINCT p.id) as project_count
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      LEFT JOIN projects p ON d.id = p.assigned_team_id
      GROUP BY d.name
    `);

    const topPerformersRes = await db.query(`
      SELECT name, designation, performance_score
      FROM users
      WHERE role = 'staff'
      ORDER BY performance_score DESC
      LIMIT 5
    `);

    return res.json({
      taskStatusStats: taskStatusRes.rows,
      leadStatusStats: leadStatusRes.rows,
      departmentStats: departmentStatsRes.rows,
      topPerformers: topPerformersRes.rows
    });
  } catch (err) {
    console.error('Admin Statistics Fetch Error:', err);
    return res.status(500).json({ error: 'Internal server error calculating systems statistics' });
  }
};

/**
 * PUT /api/admin/users/:id/deactivate
 */
const deactivateUser = async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own logged-in account' });
  }

  if (isDbOffline()) {
    const userKey = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    if (!userKey) return res.status(404).json({ error: 'User not found in mock database' });
    MOCK_USERS[userKey].status = 'deactivated';
    return res.json(MOCK_USERS[userKey]);
  }

  try {
    const query = `
      UPDATE users 
      SET status = 'deactivated', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING id, employee_id, name, email, role, status
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Deactivate User Error:', err);
    return res.status(500).json({ error: 'Internal server error deactivating user' });
  }
};

/**
 * PUT /api/admin/users/:id/activate
 */
const activateUser = async (req, res) => {
  const { id } = req.params;

  if (isDbOffline()) {
    const userKey = Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id);
    if (!userKey) return res.status(404).json({ error: 'User not found in mock database' });
    MOCK_USERS[userKey].status = 'active';
    return res.json(MOCK_USERS[userKey]);
  }

  try {
    const query = `
      UPDATE users 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING id, employee_id, name, email, role, status
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Activate User Error:', err);
    return res.status(500).json({ error: 'Internal server error activating user' });
  }
};

/**
 * POST /api/admin/users/upload-profile-image
 */
const uploadProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const filename = `profile_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const uploadPath = path.join(__dirname, '../uploads', filename);
    fs.writeFileSync(uploadPath, req.file.buffer);

    const imageUrl = `/uploads/${filename}`;
    return res.json({ imageUrl });
  } catch (err) {
    console.error('Upload Profile Photo Error:', err);
    return res.status(500).json({ error: 'Internal server error saving uploaded image file' });
  }
};

/**
 * GET /api/admin/users/export/excel
 */
const exportUsersExcel = async (req, res) => {
  try {
    let users = [];
    if (isDbOffline()) {
      users = Object.values(MOCK_USERS);
    } else {
      const query = `
        SELECT u.employee_id, u.name, u.email, u.phone, u.role, u.designation, u.status, u.joining_date, d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.name ASC
      `;
      const result = await db.query(query);
      users = result.rows;
    }
    const { generateUsersExcel } = require('../utils/excelUsersGenerator');
    await generateUsersExcel(res, users);
  } catch (err) {
    console.error('Export Users Excel Error:', err);
    return res.status(500).json({ error: 'Failed to compile users Excel worksheet report' });
  }
};

/**
 * GET /api/admin/users/export/pdf
 */
const exportUsersPDF = async (req, res) => {
  try {
    let users = [];
    if (isDbOffline()) {
      users = Object.values(MOCK_USERS);
    } else {
      const query = `
        SELECT u.employee_id, u.name, u.email, u.phone, u.role, u.designation, u.status, d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.name ASC
      `;
      const result = await db.query(query);
      users = result.rows;
    }
    const { generateUsersPDF } = require('../utils/pdfUsersGenerator');
    generateUsersPDF(res, users);
  } catch (err) {
    console.error('Export Users PDF Error:', err);
    return res.status(500).json({ error: 'Failed to compile users PDF document report' });
  }
};

const getSettings = async (req, res) => {
  if (isDbOffline()) {
    return res.json({
      company_name: 'Aspire Holidays (Mock)',
      company_logo: '/uploads/logo_default.png',
      working_hours_start: '09:00',
      working_hours_end: '18:00',
      password_min_length: '8',
      smtp_host: 'smtp.mailtrap.io',
      smtp_port: '2525',
      smtp_secure: 'false',
      backup_frequency: 'daily'
    });
  }

  try {
    const result = await db.query('SELECT key, value FROM system_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return res.json(settings);
  } catch (err) {
    console.error('Get Settings Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching system settings' });
  }
};

const updateSettings = async (req, res) => {
  const settings = req.body;

  if (isDbOffline()) {
    return res.json({ message: 'Settings updated successfully (Mock Mode)', settings });
  }

  try {
    await db.query('BEGIN');
    for (const key of Object.keys(settings)) {
      const val = settings[key] !== null ? String(settings[key]) : '';
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [key, val]);
    }
    await db.query('COMMIT');
    return res.json({ message: 'System settings updated successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Update Settings Error:', err);
    return res.status(500).json({ error: 'Internal server error updating settings' });
  }
};

const uploadCompanyLogo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Logo file is required' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const filename = `logo_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const uploadDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    const logoUrl = `/uploads/${filename}`;

    if (!isDbOffline()) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('company_logo', $1)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [logoUrl]);
    }

    return res.json({ logoUrl });
  } catch (err) {
    console.error('Upload Company Logo Error:', err);
    return res.status(500).json({ error: 'Internal server error saving logo file' });
  }
};

const triggerBackup = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.join(__dirname, '../backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = Date.now();
    const backupFileName = `backup_${timestamp}.sql`;
    const backupFilePath = path.join(backupDir, backupFileName);

    let sqlContent = '-- Aspire Task Pro Database Backup\n';
    sqlContent += `-- Generated on ${new Date().toISOString()}\n\n`;

    if (isDbOffline()) {
      sqlContent += '-- Database offline. Exported structural mocks only.\n';
    } else {
      sqlContent += '-- Active PostgreSQL Connection Active\n';
      const tablesRes = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      sqlContent += `-- Total Tables found: ${tablesRes.rows.length}\n`;
      for (const t of tablesRes.rows) {
        sqlContent += `-- Table: ${t.table_name}\n`;
      }
    }

    fs.writeFileSync(backupFilePath, sqlContent);
    return res.json({
      message: 'System backup generated successfully',
      fileName: backupFileName,
      url: `/backups/${backupFileName}`
    });
  } catch (err) {
    console.error('Trigger Backup Error:', err);
    return res.status(500).json({ error: 'Internal server error compiling backup database file' });
  }
};

const getNotifications = async (req, res) => {
  if (isDbOffline()) {
    return res.json([
      { id: '1', title: 'Database Mode Warning', message: 'Database is offline. Simulated logs loaded.', type: 'system', read: false, created_at: new Date().toISOString() }
    ]);
  }

  try {
    const result = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Notifications Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching system notifications log' });
  }
};

const markNotificationRead = async (req, res) => {
  const { id } = req.params;

  if (isDbOffline()) {
    return res.json({ message: 'Notification marked as read (Mock Mode)' });
  }

  try {
    await db.query('UPDATE notifications SET read = TRUE WHERE id = $1', [id]);
    return res.json({ message: 'Notification marked as read successfully' });
  } catch (err) {
    console.error('Mark Notification Read Error:', err);
    return res.status(500).json({ error: 'Internal server error closing notification alert' });
  }
};

const logNotification = async (userId, title, message, type) => {
  if (isDbOffline()) return;
  try {
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, $2, $3, $4)
    `, [userId || null, title, message, type]);
  } catch (err) {
    console.error('Log Notification Error:', err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getDashboard,
  getStatistics,
  deactivateUser,
  activateUser,
  uploadProfileImage,
  exportUsersExcel,
  exportUsersPDF,
  getSettings,
  updateSettings,
  uploadCompanyLogo,
  triggerBackup,
  getNotifications,
  markNotificationRead,
  logNotification
};
