const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V7 Database Updates for Voice Messages...');

  try {
    console.log('Adding message_type to task_comments...');
    await db.query(`
      ALTER TABLE task_comments 
      ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
    `);

    console.log('Adding audio_url to task_comments...');
    await db.query(`
      ALTER TABLE task_comments 
      ADD COLUMN IF NOT EXISTS audio_url TEXT;
    `);

    console.log('Adding audio_file_name to task_comments...');
    await db.query(`
      ALTER TABLE task_comments 
      ADD COLUMN IF NOT EXISTS audio_file_name TEXT;
    `);

    console.log('Adding audio_mime_type to task_comments...');
    await db.query(`
      ALTER TABLE task_comments 
      ADD COLUMN IF NOT EXISTS audio_mime_type VARCHAR(100);
    `);

    console.log('Adding audio_duration_seconds to task_comments...');
    await db.query(`
      ALTER TABLE task_comments 
      ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;
    `);

    console.log('Making comment column nullable...');
    await db.query(`
      ALTER TABLE task_comments 
      ALTER COLUMN comment DROP NOT NULL;
    `);

    console.log('Database V7 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V7 database update script:', err);
    process.exit(1);
  }
};

runMigration();
