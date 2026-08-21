const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V11 Database Updates (Attendance Selfie Enhancements)...');

  try {
    console.log('Adding selfie columns to attendance table...');
    await db.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS punch_in_selfie VARCHAR(255),
      ADD COLUMN IF NOT EXISTS punch_out_selfie VARCHAR(255);
    `);

    console.log('Database V11 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V11 database update script:', err);
    process.exit(1);
  }
};

runMigration();
