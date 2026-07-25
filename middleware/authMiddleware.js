const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_aspire_task_pro_key_12345!';

/**
 * Middleware to authenticate requests via JWT
 */
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
      return res.status(401).json({ error: 'Access token format invalid' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      let user;

      // Handle Mock user lookup
      const isMockId = ['admin_1', 'mgr_1', 'tl_1', 'staff_1'].includes(decoded.id);
      if (isMockId) {
        const { MOCK_USERS } = require('../utils/mockUsers');
        user = Object.values(MOCK_USERS).find(u => u.id === decoded.id);
      }

      // If database is failing, fallback to check mock users
      if (!user && db.isConnectionFailed && db.isConnectionFailed()) {
        const { MOCK_USERS } = require('../utils/mockUsers');
        user = Object.values(MOCK_USERS).find(u => u.id === decoded.id);
      }

      // Query database if user not found in mock list
      if (!user) {
        try {
          const userRes = await db.query('SELECT id, employee_id, name, email, role, designation, department_id FROM users WHERE id = $1', [decoded.id]);
          if (userRes && userRes.rows && userRes.rows.length > 0) {
            user = userRes.rows[0];
          }
        } catch (dbErr) {
          console.error('Database query failed in JWT authentication middleware, checking mocks:', dbErr.message);
          const { MOCK_USERS } = require('../utils/mockUsers');
          user = Object.values(MOCK_USERS).find(u => u.id === decoded.id);
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'User associated with token no longer exists' });
      }

      req.user = user; // Attach user profile to request
      next();
    } catch (err) {
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
  } else {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
};

/**
 * Middleware to restrict access based on User Role(s)
 * @param {Array<string>} roles - Array of permitted roles: 'manager', 'team_leader', 'staff'
 */
const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User context not found. Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access Denied. Role '${req.user.role}' is not authorized to perform this operation.` 
      });
    }

    next();
  };
};

module.exports = {
  authenticateJWT,
  authorizeRoles
};
