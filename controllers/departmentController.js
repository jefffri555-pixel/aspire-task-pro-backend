const db = require('../config/database');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

// In-memory mock departments store for fallback
const MOCK_DEPARTMENTS = [
  { id: 'dept_sales', name: 'Sales & Marketing', user_count: 2, project_count: 1, is_active: true },
  { id: 'dept_ops', name: 'Operations & Bookings', user_count: 1, project_count: 1, is_active: true },
  { id: 'dept_support', name: 'Customer Support', user_count: 0, project_count: 1, is_active: true },
  { id: 'dept_admin', name: 'Finance & Administration', user_count: 2, project_count: 1, is_active: true },
];

/**
 * GET /api/departments
 */
const getDepartments = async (req, res) => {
  const { activeOnly } = req.query;

  if (isDbOffline()) {
    if (activeOnly === 'true') {
      return res.json(MOCK_DEPARTMENTS.filter(d => d.is_active !== false));
    }
    return res.json(MOCK_DEPARTMENTS);
  }

  try {
    let whereClause = '';
    let params = [];
    if (activeOnly === 'true') {
      whereClause = 'WHERE d.is_active = $1';
      params.push(true);
    }

    if (req.user && req.user.role === 'team_leader') {
      if (whereClause) {
        whereClause += ` AND d.id = $${params.length + 1}`;
      } else {
        whereClause = `WHERE d.id = $1`;
      }
      params.push(req.user.department_id);
    }

    const query = `
      SELECT d.id, d.name, d.created_at, d.is_active,
             COUNT(DISTINCT u.id) as user_count,
             COUNT(DISTINCT p.id) as project_count
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      LEFT JOIN projects p ON d.id = p.assigned_team_id
      ${whereClause}
      GROUP BY d.id, d.name, d.created_at, d.is_active
      ORDER BY d.name ASC
    `;
    const result = await db.query(query, params);
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
    if (MOCK_DEPARTMENTS.some(d => d.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json({ error: 'A department with this name already exists' });
    }
    const newDept = {
      id: `dept_${Date.now()}`,
      name: name.trim(),
      is_active: true,
      user_count: 0,
      project_count: 0
    };
    MOCK_DEPARTMENTS.push(newDept);
    return res.status(201).json(newDept);
  }

  try {
    const checkQuery = `SELECT id FROM departments WHERE LOWER(name) = LOWER($1)`;
    const checkResult = await db.query(checkQuery, [name.trim()]);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: 'A department with this name already exists' });
    }

    const query = `
      INSERT INTO departments (name, is_active)
      VALUES ($1, true)
      RETURNING id, name, created_at, is_active
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
      return res.status(409).json({ error: 'A department with this name already exists' });
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
    if (MOCK_DEPARTMENTS.some(d => d.id !== id && d.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json({ error: 'A department with this name already exists' });
    }
    const dept = MOCK_DEPARTMENTS.find(d => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found in mock database' });
    }
    dept.name = name.trim();
    return res.json(dept);
  }

  try {
    const checkQuery = `SELECT id FROM departments WHERE LOWER(name) = LOWER($1) AND id != $2`;
    const checkResult = await db.query(checkQuery, [name.trim(), id]);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: 'A department with this name already exists' });
    }

    const query = `
      UPDATE departments
      SET name = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, created_at, is_active
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

const toggleStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active boolean field is required' });
  }

  if (isDbOffline()) {
    const dept = MOCK_DEPARTMENTS.find(d => d.id === id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    dept.is_active = is_active;
    return res.json(dept);
  }

  try {
    const query = `
      UPDATE departments
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, is_active
    `;
    const result = await db.query(query, [is_active, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle Department Status Error:', err);
    return res.status(500).json({ error: 'Internal server error updating department status' });
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
  toggleStatus,
  assignEmployees,
  getDepartmentStats
};
