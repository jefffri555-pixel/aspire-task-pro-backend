const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.post('/register-token', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token, device_type } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'FCM token is required'
            });
        }

        await db.query(
            `
      INSERT INTO push_tokens (
        user_id,
        token,
        device_type,
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        device_type = EXCLUDED.device_type,
        updated_at = CURRENT_TIMESTAMP
      `,
            [userId, token, device_type || 'android']
        );

        return res.status(200).json({
            success: true,
            message: 'FCM token registered successfully'
        });

    } catch (err) {
        console.error('FCM token registration error:', err.message);

        return res.status(500).json({
            success: false,
            message: 'Failed to register FCM token'
        });
    }
});

module.exports = router;