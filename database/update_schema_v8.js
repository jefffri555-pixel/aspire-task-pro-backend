const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V8 Database Updates for Task Audio...');

  try {
    console.log('Adding title_audio columns to tasks...');
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS title_audio_url TEXT;
    `);
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS title_audio_file_name TEXT;
    `);
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS title_audio_mime_type VARCHAR(100);
    `);
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS title_audio_duration_seconds INTEGER;
    `);

    console.log('Adding description_audio columns to tasks...');
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS description_audio_url TEXT;
    `);
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS description_audio_file_name TEXT;
    `);
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS description_audio_mime_type VARCHAR(100);
    `);
    await db.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS description_audio_duration_seconds INTEGER;
    `);

    console.log('Database V8 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V8 database update script:', err);
    process.exit(1);
  }
};

runMigration();
