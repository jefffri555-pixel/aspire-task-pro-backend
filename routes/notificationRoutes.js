const express = require('express');
const router = express.Router();

const {
    getNotifications,
    markAsRead,
    deleteNotification
} = require('../controllers/notificationController');

// Get all notifications
router.get('/', getNotifications);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

module.exports = router;