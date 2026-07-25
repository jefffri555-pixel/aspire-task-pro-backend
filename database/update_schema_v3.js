const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V3 Database Updates...');

  try {
    console.log('Adding status and profile_image columns to users table...');
    
    // Add columns
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) DEFAULT NULL;
    `);

    console.log('Database V3 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V3 database update script:', err);
    process.exit(1);
  }
};

runMigration();
