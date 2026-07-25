const db = require('../config/database');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

// In-memory mock projects store for fallback
let MOCK_PROJECTS = [];

/**
 * Get projects list filtered by user role
 */
const getProjects = async (req, res) => {
  const { role, department_id } = req.user;
  const { status, priority } = req.query;

  if (isDbOffline()) {
    return res.json(MOCK_PROJECTS);
  }

  try {
    let query = `
      SELECT p.*, d.name AS team_name,
             m.name AS manager_name,
             tl.name AS team_leader_name
      FROM projects p
      LEFT JOIN departments d ON p.assigned_team_id = d.id
      LEFT JOIN users m ON p.manager_id = m.id
      LEFT JOIN users tl ON p.team_leader_id = tl.id
    `;
    const conditions = [];
    const params = [];

    // Role-based filtering: Staff/TL see only their department's projects
    if (role === 'team_leader' || role === 'staff') {
      conditions.push(`p.assigned_team_id = $${params.length + 1}`);
      params.push(department_id);
    }

    if (status) {
      conditions.push(`p.status = $${params.length + 1}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`p.priority = $${params.length + 1}`);
      params.push(priority);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.due_date ASC, p.created_at DESC';

    const projectsRes = await db.query(query, params);
    return res.json(projectsRes.rows);
  } catch (err) {
    console.error('Get Projects Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching projects list' });
  }
};

/**
 * Get project by ID along with its tasks and assigned team members
 */
const getProjectById = async (req, res) => {
  const { id } = req.params;

  if (isDbOffline()) {
    const proj = MOCK_PROJECTS.find(p => p.id === id);
    if (!proj) return res.status(404).json({ error: 'Project not found' });
    return res.json(proj);
  }

  try {
    const projectQuery = `
      SELECT p.*, d.name AS team_name,
             m.name AS manager_name,
             tl.name AS team_leader_name
      FROM projects p
      LEFT JOIN departments d ON p.assigned_team_id = d.id
      LEFT JOIN users m ON p.manager_id = m.id
      LEFT JOIN users tl ON p.team_leader_id = tl.id
      WHERE p.id = $1
    `;
    const projectRes = await db.query(projectQuery, [id]);

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectRes.rows[0];

    // Fetch tasks associated with project
    const tasksQuery = `
      SELECT t.*, creator.name AS assigned_by_name, assignee.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users creator ON t.assigned_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `;
    const tasksRes = await db.query(tasksQuery, [id]);
    project.tasks = tasksRes.rows;

    // Fetch project assigned staff members
    const membersQuery = `
      SELECT u.id, u.employee_id, u.name, u.email, u.role, u.designation, u.profile_image
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `;
    const membersRes = await db.query(membersQuery, [id]);
    project.assigned_employees = membersRes.rows;

    return res.json(project);
  } catch (err) {
    console.error('Get Project By ID Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching project detail' });
  }
};

/**
 * Create a new Project (Manager only)
 */
const createProject = async (req, res) => {
  const { role } = req.user;
  const { name, client_name, start_date, due_date, priority, assigned_team_id, manager_id, team_leader_id, assigned_employee_ids } = req.body;

  if (role !== 'manager') {
    return res.status(403).json({ error: 'Access denied. Managers only.' });
  }

  if (!name || !client_name || !start_date || !due_date || !assigned_team_id) {
    return res.status(400).json({ error: 'Missing required project attributes.' });
  }

  if (isDbOffline()) {
    const mockProj = {
      id: `proj_${Date.now()}`,
      project_id: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      client_name,
      start_date,
      due_date,
      priority: priority || 'medium',
      status: 'not_started',
      assigned_team_id,
      manager_id: manager_id || null,
      team_leader_id: team_leader_id || null,
      progress_percentage: 0,
      tasks: [],
      assigned_employees: []
    };
    MOCK_PROJECTS.push(mockProj);
    return res.status(201).json(mockProj);
  }

  try {
    await db.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO projects (name, client_name, start_date, due_date, priority, status, assigned_team_id, manager_id, team_leader_id, progress_percentage)
      VALUES ($1, $2, $3, $4, $5, 'not_started', $6, $7, $8, 0)
      RETURNING *
    `;
    const params = [
      name, 
      client_name, 
      start_date, 
      due_date, 
      priority || 'medium', 
      assigned_team_id,
      manager_id || null,
      team_leader_id || null
    ];
    const projectRes = await db.query(insertQuery, params);
    const newProject = projectRes.rows[0];

    // Assign employees
    if (Array.isArray(assigned_employee_ids) && assigned_employee_ids.length > 0) {
      for (const userId of assigned_employee_ids) {
        await db.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)', 
          [newProject.id, userId]
        );
      }
    }

    await db.query('COMMIT');
    
    // Save notification
    try {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [newProject.manager_id || newProject.team_leader_id || null, 'New Project Initiated', `Project "${newProject.name}" has been created for client "${newProject.client_name}".`, 'project_update']
      );
    } catch (nErr) {
      console.error('Project notification error:', nErr);
    }

    return res.status(201).json(newProject);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Create Project Error:', err);
    return res.status(500).json({ error: 'Internal server error creating project.' });
  }
};

/**
 * Update Project fields / status / team members
 */
const updateProject = async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    client_name, 
    start_date, 
    due_date, 
    priority, 
    status, 
    assigned_team_id, 
    manager_id, 
    team_leader_id, 
    assigned_employee_ids, 
    progress_percentage 
  } = req.body;

  if (isDbOffline()) {
    const proj = MOCK_PROJECTS.find(p => p.id === id);
    if (!proj) return res.status(404).json({ error: 'Project not found' });
    
    if (name !== undefined) proj.name = name;
    if (client_name !== undefined) proj.client_name = client_name;
    if (start_date !== undefined) proj.start_date = start_date;
    if (due_date !== undefined) proj.due_date = due_date;
    if (priority !== undefined) proj.priority = priority;
    if (status !== undefined) proj.status = status;
    if (assigned_team_id !== undefined) proj.assigned_team_id = assigned_team_id;
    if (manager_id !== undefined) proj.manager_id = manager_id;
    if (team_leader_id !== undefined) proj.team_leader_id = team_leader_id;
    if (progress_percentage !== undefined) proj.progress_percentage = progress_percentage;

    return res.json(proj);
  }

  try {
    // Check project exists
    const checkQuery = `SELECT * FROM projects WHERE id = $1`;
    const checkRes = await db.query(checkQuery, [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await db.query('BEGIN');

    const fields = [];
    const params = [];
    
    if (name !== undefined) {
      fields.push(`name = $${params.length + 1}`);
      params.push(name);
    }
    if (client_name !== undefined) {
      fields.push(`client_name = $${params.length + 1}`);
      params.push(client_name);
    }
    if (start_date !== undefined) {
      fields.push(`start_date = $${params.length + 1}`);
      params.push(start_date);
    }
    if (due_date !== undefined) {
      fields.push(`due_date = $${params.length + 1}`);
      params.push(due_date);
    }
    if (priority !== undefined) {
      fields.push(`priority = $${params.length + 1}`);
      params.push(priority);
    }
    if (status !== undefined) {
      fields.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (assigned_team_id !== undefined) {
      fields.push(`assigned_team_id = $${params.length + 1}`);
      params.push(assigned_team_id);
    }
    if (manager_id !== undefined) {
      fields.push(`manager_id = $${params.length + 1}`);
      params.push(manager_id);
    }
    if (team_leader_id !== undefined) {
      fields.push(`team_leader_id = $${params.length + 1}`);
      params.push(team_leader_id);
    }
    if (progress_percentage !== undefined) {
      fields.push(`progress_percentage = $${params.length + 1}`);
      params.push(progress_percentage);
    }

    let updatedProject = checkRes.rows[0];

    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      params.push(id);
      const updateQuery = `
        UPDATE projects 
        SET ${fields.join(', ')} 
        WHERE id = $${params.length} 
        RETURNING *
      `;
      const updatedRes = await db.query(updateQuery, params);
      updatedProject = updatedRes.rows[0];
    }

    // Update Project Members
    if (assigned_employee_ids !== undefined && Array.isArray(assigned_employee_ids)) {
      await db.query('DELETE FROM project_members WHERE project_id = $1', [id]);
      for (const userId of assigned_employee_ids) {
        await db.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)', 
          [id, userId]
        );
      }
    }

    await db.query('COMMIT');
    
    // Save notification
    if (checkRes.rows[0].status !== updatedProject.status) {
      try {
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [updatedProject.manager_id || updatedProject.team_leader_id || null, 'Project Status Changed', `Project "${updatedProject.name}" status updated to ${updatedProject.status.toUpperCase()}.`, 'project_update']
        );
      } catch (nErr) {
        console.error('Project notification update error:', nErr);
      }
    }

    return res.json(updatedProject);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Update Project Error:', err);
    return res.status(500).json({ error: 'Internal server error updating project details.' });
  }
};

/**
 * Delete Project (Manager only)
 */
const deleteProject = async (req, res) => {
  const { role } = req.user;
  const { id } = req.params;

  if (role !== 'manager') {
    return res.status(403).json({ error: 'Access denied. Managers only.' });
  }

  if (isDbOffline()) {
    const idx = MOCK_PROJECTS.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    MOCK_PROJECTS.splice(idx, 1);
    return res.json({ message: 'Project deleted successfully (offline)' });
  }

  try {
    const deleteQuery = `DELETE FROM projects WHERE id = $1 RETURNING *`;
    const deleteRes = await db.query(deleteQuery, [id]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    return res.json({ message: 'Project deleted successfully.', project: deleteRes.rows[0] });
  } catch (err) {
    console.error('Delete Project Error:', err);
    return res.status(500).json({ error: 'Internal server error deleting project.' });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
