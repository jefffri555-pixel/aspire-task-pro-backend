const db = require('../config/database');

// Get all settings
const getSettings = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM system_settings ORDER BY key'
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({
            error: 'Unable to fetch settings'
        });
    }
};

// Update or Create setting
const updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({
                error: 'Key and Value are required'
            });
        }

        await db.query(
            `
      INSERT INTO system_settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key)
      DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
      `,
            [key, value]
        );

        res.json({
            message: 'Setting updated successfully'
        });

    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({
            error: 'Unable to update setting'
        });
    }
};

module.exports = {
    getSettings,
    updateSetting
};