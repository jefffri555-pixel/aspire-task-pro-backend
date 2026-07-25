const db = require('../config/database');

// Get all notifications
const getNotifications = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM notifications ORDER BY created_at DESC'
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Failed to fetch notifications'
        });
    }
};

// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE notifications SET read = true WHERE id = $1',
            [id]
        );

        res.json({
            message: 'Notification marked as read'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Unable to update notification'
        });
    }
};

// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'DELETE FROM notifications WHERE id = $1',
            [id]
        );

        res.json({
            message: 'Notification deleted'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Unable to delete notification'
        });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    deleteNotification
};
