const db = require('../config/database');

const runMigration = async () => {
  console.log('Starting Aspire Task Pro V4 Database Schema Updates...');

  try {
    // 1. Add manager_id and team_leader_id to projects
    console.log('Adding manager_id and team_leader_id to projects...');
    await db.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS team_leader_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    // 2. Create project_members join table
    console.log('Creating project_members join table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, user_id)
      );
    `);

    // 3. Create task_history table
    console.log('Creating task_history table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS task_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        old_value VARCHAR(255),
        new_value VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database V4 updates executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running V4 database update script:', err);
    process.exit(1);
  }
};

runMigration();
