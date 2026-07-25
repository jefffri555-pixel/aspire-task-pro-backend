const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.get('/profile', authenticateJWT, authController.getProfile);
router.post('/change-password', authenticateJWT, authController.changePassword);

module.exports = router;
