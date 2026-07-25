const db = require('../config/database');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

// In-memory mock departments store for fallback
const MOCK_DEPARTMENTS = [
  { id: 'dept_sales', name: 'Sales & Marketing', user_count: 2, project_count: 1 },
  { id: 'dept_ops', name: 'Operations & Bookings', user_count: 1, project_count: 1 },
  { id: 'dept_support', name: 'Customer Support', user_count: 0, project_count: 1 },
  { id: 'dept_admin', name: 'Finance & Administration', user_count: 2, project_count: 1 },
];

/**
 * GET /api/departments
 */
const getDepartments = async (req, res) => {
  if (isDbOffline()) {
    return res.json(MOCK_DEPARTMENTS);
  }

  try {
    const query = `
      SELECT d.id, d.name, d.created_at,
             COUNT(DISTINCT u.id) as user_count,
             COUNT(DISTINCT p.id) as project_count
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      LEFT JOIN projects p ON d.id = p.assigned_team_id
      GROUP BY d.id, d.name, d.created_at
      ORDER BY d.name ASC
    `;
    const result = await db.query(query);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Departments Error:', err);
    return res.status(500).json({ error: 'Internal server error listing departments' });
  }
};

/**
 * POST /api/departments
 */
const createDepartment = async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Department name is required' });
  }

  if (isDbOffline()) {
    const newDept = {
      id: `dept_${Date.now()}`,
      name: name.trim(),
      user_count: 0,
      project_count: 0
    };
    MOCK_DEPARTMENTS.push(newDept);
    return res.status(201).json(newDept);
  }

  try {
    const query = `
      INSERT INTO departments (name)
      VALUES ($1)
      RETURNING id, name, created_at
    `;
    const result = await db.query(query, [name.trim()]);
    return res.status(201).json({
      ...result.rows[0],
      user_count: 0,
      project_count: 0
    });
  } catch (err) {
    console.error('Create Department Error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A department with this name already exists' });
    }
    return res.status(500).json({ error: 'Internal server error creating department' });
  }
};

/**
 * PUT /api/departments/:id
 */
const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Department name is required' });
  }

  if (isDbOffline()) {
    const dept = MOCK_DEPARTMENTS.find(d => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found in mock database' });
    }
    dept.name = name.trim();
    return res.json(dept);
  }

  try {
    const query = `
      UPDATE departments
      SET name = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, created_at
    `;
    const result = await db.query(query, [name.trim(), id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update Department Error:', err);
    return res.status(500).json({ error: 'Internal server error updating department' });
  }
};

/**
 * DELETE /api/departments/:id
 */
const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  if (isDbOffline()) {
    const idx = MOCK_DEPARTMENTS.findIndex(d => d.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Department not found in mock database' });
    }
    MOCK_DEPARTMENTS.splice(idx, 1);
    return res.json({ message: 'Department successfully deleted' });
  }

  try {
    const result = await db.query('DELETE FROM departments WHERE id = $1 RETURNING name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    return res.json({ message: `Successfully deleted department: ${result.rows[0].name}` });
  } catch (err) {
    console.error('Delete Department Error:', err);
    return res.status(500).json({ error: 'Internal server error deleting department' });
  }
};

const assignEmployees = async (req, res) => {
  const { id } = req.params;
  const { userIds } = req.body;

  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds must be an array of user IDs' });
  }

  if (isDbOffline()) {
    return res.json({ message: 'Employees assigned successfully to department (offline mock)' });
  }

  try {
    await db.query('BEGIN');
    // Clear old users from department
    await db.query('UPDATE users SET department_id = NULL WHERE department_id = $1', [id]);
    // Assign new users to department
    if (userIds.length > 0) {
      await db.query('UPDATE users SET department_id = $1 WHERE id = ANY($2)', [id, userIds]);
    }
    await db.query('COMMIT');
    return res.json({ message: 'Employees assigned to department successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Assign Employees Error:', err);
    return res.status(500).json({ error: 'Internal server error assigning employees to department' });
  }
};

const getDepartmentStats = async (req, res) => {
  const { id } = req.params;

  if (isDbOffline()) {
    return res.json({
      total_employees: 3,
      avg_performance: 92.5,
      total_projects: 2,
      task_stats: { pending: 2, in_progress: 1, completed: 5 }
    });
  }

  try {
    const empCountRes = await db.query('SELECT COUNT(*) FROM users WHERE department_id = $1', [id]);
    const perfRes = await db.query('SELECT COALESCE(ROUND(AVG(performance_score), 2), 100.00) AS avg_perf FROM users WHERE department_id = $1', [id]);
    const projCountRes = await db.query('SELECT COUNT(*) FROM projects WHERE assigned_team_id = $1', [id]);
    
    // Group task count by status
    const tasksRes = await db.query(`
      SELECT status, COUNT(*) 
      FROM tasks 
      WHERE department_id = $1 OR project_id IN (SELECT id FROM projects WHERE assigned_team_id = $1)
      GROUP BY status
    `, [id]);

    const taskStats = {};
    tasksRes.rows.forEach(row => {
      taskStats[row.status] = parseInt(row.count);
    });

    return res.json({
      total_employees: parseInt(empCountRes.rows[0].count),
      avg_performance: parseFloat(perfRes.rows[0].avg_perf),
      total_projects: parseInt(projCountRes.rows[0].count),
      task_stats: taskStats
    });
  } catch (err) {
    console.error('Get Department Stats Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching department statistics' });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignEmployees,
  getDepartmentStats
};
