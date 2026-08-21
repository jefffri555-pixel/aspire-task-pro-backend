const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V16 Database Updates (Holidays)...');

  try {
    console.log('Creating holidays table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(150) NOT NULL,
        date DATE NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed some initial settings for weekly offs if they don't exist
    await db.query(`
      INSERT INTO system_settings (key, value)
      VALUES 
        ('weekly_off_days', '["Sunday"]'),
        ('saturday_off_rule', 'No Saturday Off')
      ON CONFLICT (key) DO NOTHING
    `);

    console.log('Database V16 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V16 database update script:', err);
    process.exit(1);
  }
};

runMigration();
