const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V5 Database Updates...');

  try {
    // 1. Create notifications table
    console.log('Creating notifications table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create system_settings table
    console.log('Creating system_settings table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Seed default system settings
    console.log('Seeding default system settings...');
    const defaultSettings = [
      { key: 'company_name', value: 'Aspire Holidays' },
      { key: 'company_logo', value: '/uploads/logo_default.png' },
      { key: 'working_hours_start', value: '09:00' },
      { key: 'working_hours_end', value: '18:00' },
      { key: 'password_min_length', value: '8' },
      { key: 'smtp_host', value: 'smtp.mailtrap.io' },
      { key: 'smtp_port', value: '2525' },
      { key: 'smtp_secure', value: 'false' },
      { key: 'backup_frequency', value: 'daily' }
    ];

    for (const setting of defaultSettings) {
      await db.query(`
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO NOTHING
      `, [setting.key, setting.value]);
    }

    console.log('Database V5 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V5 database update script:', err);
    process.exit(1);
  }
};

runMigration();
