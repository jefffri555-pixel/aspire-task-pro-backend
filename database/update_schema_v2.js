const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V2 Database Updates...');

  try {
    // 1. Create attendance table
    console.log('Creating attendance table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'present',
        check_in_time TIMESTAMP WITH TIME ZONE,
        check_out_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );
    `);

    // 2. Create leave_requests table
    console.log('Creating leave_requests table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reason TEXT,
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Seed some mock data if empty
    console.log('Checking and seeding attendance & leave records...');
    
    // Get seeded users to link against
    const usersRes = await db.query("SELECT id, name FROM users WHERE role = 'staff' LIMIT 2");
    if (usersRes.rows.length > 0) {
      const staff1 = usersRes.rows[0].id;
      const staff2 = usersRes.rows[1] ? usersRes.rows[1].id : staff1;

      // Check attendance
      const attCheck = await db.query("SELECT COUNT(*) FROM attendance");
      if (parseInt(attCheck.rows[0].count) === 0) {
        console.log('Seeding initial attendance logs...');
        await db.query(`
          INSERT INTO attendance (user_id, date, status, check_in_time, check_out_time) VALUES
          ($1, CURRENT_DATE, 'present', CURRENT_DATE + TIME '09:00:00', CURRENT_DATE + TIME '18:00:00'),
          ($2, CURRENT_DATE, 'present', CURRENT_DATE + TIME '09:15:00', NULL)
        `, [staff1, staff2]);
      }

      // Check leaves
      const leaveCheck = await db.query("SELECT COUNT(*) FROM leave_requests");
      if (parseInt(leaveCheck.rows[0].count) === 0) {
        console.log('Seeding initial leave requests...');
        await db.query(`
          INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, status, reason) VALUES
          ($1, 'sick', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'pending', 'Fever and cold. Need rest.'),
          ($2, 'casual', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '4 days', 'approved', 'Family event.')
        `, [staff1, staff2]);
      }
    }

    console.log('Database V2 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V2 database update script:', err);
    process.exit(1);
  }
};

runMigration();
