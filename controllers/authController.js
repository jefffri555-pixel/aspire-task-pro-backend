const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { MOCK_USERS } = require('../utils/mockUsers');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_aspire_task_pro_key_12345!';

/**
 * Helper to handle mock authentication
 */
const handleMockLogin = (identifier, password, res) => {
  const emailKey = identifier.toLowerCase().trim();
  const mockUser = MOCK_USERS[emailKey] || Object.values(MOCK_USERS).find(u => u.phone === identifier);
  
  if (!mockUser || mockUser.password_plain !== password) {
    return res.status(401).json({ error: 'Invalid email/phone or password' });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: mockUser.id, role: mockUser.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Return copy of user object without the plain password
  const user = { ...mockUser };
  delete user.password_plain;

  return res.json({
    message: 'Login successful (Mock Mode)',
    token,
    user
  });
};

/**
 * Login handler (supports email or phone number login)
 */
const login = async (req, res) => {
  const { loginIdentifier, password } = req.body;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Login identifier (email/phone) and password are required' });
  }

  // If database connection is failed, immediately use mock auth
  if (db.isConnectionFailed && db.isConnectionFailed()) {
    return handleMockLogin(loginIdentifier, password, res);
  }

  try {
    // Query by email OR phone
    const query = `
      SELECT u.*, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.email = $1 OR u.phone = $1
    `;
    const userRes = await db.query(query, [loginIdentifier]);

    // Check connection failure state again
    if (db.isConnectionFailed && db.isConnectionFailed()) {
      return handleMockLogin(loginIdentifier, password, res);
    }

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const user = userRes.rows[0];

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password hash from response
    delete user.password_hash;

    return res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    if (db.isConnectionFailed && db.isConnectionFailed()) {
      return handleMockLogin(loginIdentifier, password, res);
    }
    console.error('Login Endpoint Error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

/**
 * Profile details of currently logged in user
 */
const getProfile = async (req, res) => {
  // If user is a mock user, return directly
  if (req.user && ['admin_1', 'mgr_1', 'tl_1', 'staff_1'].includes(req.user.id)) {
    return res.json(req.user);
  }

  try {
    if (db.isConnectionFailed && db.isConnectionFailed()) {
      if (req.user) return res.json(req.user);
      return res.status(404).json({ error: 'Profile not found (Database disconnected)' });
    }

    const query = `
      SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.designation, 
             u.joining_date, u.performance_score, d.name AS department_name,
             m.name AS reporting_manager_name, tl.name AS team_leader_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.reporting_manager_id = m.id
      LEFT JOIN users tl ON u.team_leader_id = tl.id
      WHERE u.id = $1
    `;
    const userRes = await db.query(query, [req.user.id]);
    
    if (userRes.rows.length === 0) {
      if (req.user) return res.json(req.user);
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(userRes.rows[0]);
  } catch (err) {
    if (req.user) return res.json(req.user);
    console.error('Get Profile Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching profile details' });
  }
};

/**
 * Forgot Password mock handler
 */
const forgotPassword = async (req, res) => {
  const { loginIdentifier } = req.body;

  if (!loginIdentifier) {
    return res.status(400).json({ error: 'Email or phone identifier is required' });
  }

  try {
    if (db.isConnectionFailed && db.isConnectionFailed()) {
      // Handle mock reset for mock users
      const emailKey = loginIdentifier.toLowerCase().trim();
      const mockUser = MOCK_USERS[emailKey] || Object.values(MOCK_USERS).find(u => u.phone === loginIdentifier);
      if (mockUser) {
        console.log(`[PASSWORD RESET SIMULATION - MOCK] Dispatching OTP to ${mockUser.email || mockUser.phone}`);
        return res.json({
          message: `Password reset link or code successfully sent to registered contact ${loginIdentifier} (Mock Mode)`
        });
      }
      return res.status(404).json({ error: 'Account not found with provided identifier (Mock Mode)' });
    }

    const userRes = await db.query('SELECT id, name, email, phone FROM users WHERE email = $1 OR phone = $1', [loginIdentifier]);
    
    if (userRes.rows.length === 0) {
      // Fallback for mock users even if database query succeeded but didn't find the user
      const emailKey = loginIdentifier.toLowerCase().trim();
      const mockUser = MOCK_USERS[emailKey] || Object.values(MOCK_USERS).find(u => u.phone === loginIdentifier);
      if (mockUser) {
        console.log(`[PASSWORD RESET SIMULATION - MOCK] Dispatching OTP to ${mockUser.email || mockUser.phone}`);
        return res.json({
          message: `Password reset link or code successfully sent to registered contact ${loginIdentifier} (Mock Mode)`
        });
      }
      return res.status(404).json({ error: 'Account not found with provided identifier' });
    }

    const user = userRes.rows[0];
    console.log(`[PASSWORD RESET SIMULATION] Dispatching OTP / link reset to ${user.email || user.phone}`);

    return res.json({
      message: `Password reset link or code successfully sent to registered contact ${loginIdentifier}`
    });
  } catch (err) {
    console.error('Forgot Password Endpoint Error:', err);
    return res.status(500).json({ error: 'Internal server error resetting password' });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (db.isConnectionFailed && db.isConnectionFailed()) {
    // Mock Mode
    const mockUser = Object.values(MOCK_USERS).find(u => u.id === userId);
    if (!mockUser) {
      return res.status(404).json({ error: 'User not found in mock database' });
    }
    mockUser.password_plain = newPassword;
    return res.json({ message: 'Password changed successfully (Mock Mode)' });
  }

  try {
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash } = userRes.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);
    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change Password Error:', err);
    return res.status(500).json({ error: 'Internal server error changing password' });
  }
};

module.exports = {
  login,
  getProfile,
  forgotPassword,
  changePassword
};
