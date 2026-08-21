const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V10 Database Updates (Attendance Enhancements)...');

  try {
    // 1. Add reason column to attendance table
    console.log('Adding reason column to attendance table...');
    await db.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS reason VARCHAR(255);
    `);

    // 2. Add Half Day and Absent configurable settings to system_settings
    console.log('Adding Half Day configuration to system_settings...');
    
    const settings = [
      { key: 'half_day_cutoff_time', value: '12:00:00' },
      { key: 'min_working_hours', value: '4' }
    ];

    for (const setting of settings) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO NOTHING;
      `, [setting.key, setting.value]);
    }

    console.log('Database V10 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V10 database update script:', err);
    process.exit(1);
  }
};

runMigration();
