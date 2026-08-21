const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V13 Database Updates (Attendance Notifications)...');

  try {
    console.log('1. Creating attendance_notifications_log table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_notifications_log (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        notification_type VARCHAR(50) NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date, notification_type)
      );
    `);

    console.log('Database V13 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V13 database update script:', err);
    process.exit(1);
  }
};

runMigration();
