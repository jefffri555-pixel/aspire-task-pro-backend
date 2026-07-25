const db = require('../config/database');
const bcrypt = require('bcryptjs');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro database update...');

  try {
    // 1. Check and update the user_role enum
    console.log("Checking if 'admin' role exists in user_role enum...");
    const checkEnum = await db.query(`
      SELECT 1 FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
    `);

    if (checkEnum.rows.length === 0) {
      console.log("Role 'admin' not found. Altering user_role enum...");
      await db.query("ALTER TYPE user_role ADD VALUE 'admin'");
      console.log("Successfully added 'admin' to user_role enum.");
    } else {
      console.log("Role 'admin' already exists in user_role enum.");
    }

    // 2. Check and seed default Super Admin account
    console.log("Checking if default Admin account exists...");
    const adminEmail = 'admin@aspire.com';
    const checkAdmin = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (checkAdmin.rows.length === 0) {
      console.log('Generating bcrypt hash for admin password...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password123', salt);

      console.log('Inserting default Super Admin user account...');
      const insertRes = await db.query(`
        INSERT INTO users (
          employee_id, name, email, phone, password_hash, role, designation, performance_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 100.00)
        RETURNING id, employee_id, name, email
      `, [
        'EMP-1000',
        'Administrator',
        adminEmail,
        '9999999999',
        passwordHash,
        'admin',
        'Super Admin'
      ]);

      console.log('Super Admin account created successfully:', insertRes.rows[0]);
    } else {
      console.log('Default Super Admin account already exists in database.');
    }

    console.log('Database update completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running database update script:', err);
    process.exit(1);
  }
};

runMigration();
