const db = require('../config/database');

async function runUpdate() {
  console.log('--- Starting Schema Update v9 ---');
  try {
    // 1. Check if 'managing_director' role exists in user_role enum
    console.log("Checking if 'managing_director' role exists in user_role enum...");
    const roleCheck = await db.query(`
      SELECT 1 FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'user_role' AND e.enumlabel = 'managing_director'
    `);

    if (roleCheck.rows.length === 0) {
      console.log("Role 'managing_director' not found. Altering user_role enum...");
      await db.query("ALTER TYPE user_role ADD VALUE 'managing_director' AFTER 'manager'");
      console.log("Successfully added 'managing_director' to user_role enum.");
    } else {
      console.log("Role 'managing_director' already exists in user_role enum.");
    }

    console.log('--- Schema Update v9 Completed Successfully ---');
  } catch (err) {
    console.error('Error executing Schema Update v9:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script directly if called via node
if (require.main === module) {
  runUpdate();
}

module.exports = runUpdate;
