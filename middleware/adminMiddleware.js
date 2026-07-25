/**
 * Middleware to restrict access to Super Admin role only
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User context not found. Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: `Access Denied. Role '${req.user.role}' is not authorized to perform this operation.` 
    });
  }

  next();
};

module.exports = {
  isAdmin
};
