const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V6 Database Updates...');

  try {
    // 1. Add is_active column to departments table
    console.log('Adding is_active column to departments table...');
    await db.query(`
      ALTER TABLE departments 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);

    // 2. Drop existing case-sensitive unique constraint
    console.log('Dropping existing departments unique constraint...');
    try {
      await db.query(`ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;`);
    } catch (e) {
      console.log('Constraint departments_name_key not found or already dropped.');
    }

    // 3. Add case-insensitive unique index
    console.log('Adding case-insensitive unique index to departments table...');
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS departments_name_lower_idx 
      ON departments (LOWER(name));
    `);

    console.log('Database V6 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V6 database update script:', err);
    process.exit(1);
  }
};

runMigration();
