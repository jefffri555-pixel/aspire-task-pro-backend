const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Protect all admin routes with authentication and role check
router.use(authenticateJWT);
router.use(isAdmin);

// User Management Routes
router.post('/users', adminController.createUser);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/deactivate', adminController.deactivateUser);
router.put('/users/:id/activate', adminController.activateUser);
router.post('/users/upload-image', upload.single('image'), adminController.uploadProfileImage);
router.get('/users/export/excel', adminController.exportUsersExcel);
router.get('/users/export/pdf', adminController.exportUsersPDF);

// Administrative Password Reset Route
router.post('/reset-password', adminController.resetPassword);

// Dashboard and Statistics
router.get('/dashboard', adminController.getDashboard);
router.get('/statistics', adminController.getStatistics);

// Settings, Backup & Notifications
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);
router.post('/settings/logo', upload.single('logo'), adminController.uploadCompanyLogo);
router.post('/backup', adminController.triggerBackup);
router.get('/notifications', adminController.getNotifications);
router.post('/notifications/:id/read', adminController.markNotificationRead);

module.exports = router;
