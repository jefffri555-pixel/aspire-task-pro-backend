const db = require('../config/database');
const { generateReportPDF } = require('../utils/pdfGenerator');
const { generateReportExcel } = require('../utils/excelGenerator');

/**
 * Custom-scoped dashboard statistics based on employee role
 */
const getDashboardStats = async (req, res) => {
  const { role, id, department_id } = req.user;

  try {
    if (role === 'manager') {
      // 1. Manager Metrics
      const projectStatsRes = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('not_started', 'in_progress', 'under_review') THEN 1 END) as active,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM projects
      `);

      const tasksCountRes = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'overdue' OR (due_date < NOW() AND status != 'completed') THEN 1 END) as overdue
        FROM tasks
      `);
      
      const employeesCountRes = await db.query(`
        SELECT 
          COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff,
          COUNT(CASE WHEN role = 'team_leader' THEN 1 END) as tls
        FROM users
      `);

      const monthlyStatsRes = await db.query(`
        SELECT TO_CHAR(created_at, 'Mon') as month, COUNT(*) as count
        FROM tasks
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at)
      `);

      const staffPerformanceRes = await db.query(`
        SELECT id, name, designation, performance_score
        FROM users
        WHERE role = 'staff'
        ORDER BY performance_score DESC
        LIMIT 5
      `);

      // Team Performance calculation: average progress percentage of projects/tasks per team (department)
      const teamPerformanceRes = await db.query(`
        SELECT d.name as team_name, ROUND(AVG(COALESCE(p.progress_percentage, 0)), 1) as avg_progress
        FROM departments d
        LEFT JOIN projects p ON d.id = p.assigned_team_id
        GROUP BY d.name
      `);

      const pStats = projectStatsRes.rows[0];
      const stats = tasksCountRes.rows[0];
      const counts = employeesCountRes.rows[0];

      return res.json({
        role: 'manager',
        cards: {
          totalProjects: parseInt(pStats.total) || 0,
          activeProjects: parseInt(pStats.active) || 0,
          completedProjects: parseInt(pStats.completed) || 0,
          totalEmployees: parseInt(counts.staff) || 0,
          totalTeamLeaders: parseInt(counts.tls) || 0,
          pendingTasksCount: parseInt(stats.pending) + parseInt(stats.in_progress) || 0
        },
        summary: {
          totalTasks: parseInt(stats.total) || 0,
          completedTasks: parseInt(stats.completed) || 0,
          pendingTasks: parseInt(stats.pending) || 0,
          inProgressTasks: parseInt(stats.in_progress) || 0,
          overdueTasks: parseInt(stats.overdue) || 0,
          completionPercentage: parseInt(stats.total) > 0 ? Math.round((parseInt(stats.completed) / parseInt(stats.total)) * 100) : 0
        },
        monthlyProductivity: monthlyStatsRes.rows,
        topPerformers: staffPerformanceRes.rows,
        teamPerformance: teamPerformanceRes.rows
      });

    } else if (role === 'team_leader') {
      // 2. Team Leader Metrics
      // Projects assigned to their department
      const projectsRes = await db.query(`
        SELECT 
          COUNT(*) as total,
          ROUND(AVG(COALESCE(progress_percentage, 0)), 1) as avg_progress
        FROM projects
        WHERE assigned_team_id = $1
      `, [department_id]);

      // Team tasks within department
      const teamSummaryRes = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
        FROM tasks
        WHERE department_id = $1
      `, [department_id]);

      // Staff workload distribution
      const staffWorkloadRes = await db.query(`
        SELECT u.name, COUNT(t.id) as task_count
        FROM users u
        LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status != 'completed'
        WHERE u.team_leader_id = $1 OR u.reporting_manager_id = $1
        GROUP BY u.name
      `, [id]);

      const proj = projectsRes.rows[0];
      const team = teamSummaryRes.rows[0];
      const totalTeam = parseInt(team.total) || 0;
      const completedTeam = parseInt(team.completed) || 0;

      return res.json({
        role: 'team_leader',
        projectsAssigned: parseInt(proj.total) || 0,
        teamProgress: parseFloat(proj.avg_progress) || 0.0,
        summary: {
          totalTeamTasks: totalTeam,
          completedTeamTasks: completedTeam,
          pendingTeamTasks: parseInt(team.pending) + parseInt(team.in_progress) || 0,
          teamCompletionPercentage: totalTeam > 0 ? Math.round((completedTeam / totalTeam) * 100) : 0
        },
        staffWorkload: staffWorkloadRes.rows
      });

    } else {
      // 3. Staff Metrics
      const staffTasksRes = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'overdue' OR (due_date < NOW() AND status != 'completed') THEN 1 END) as overdue,
          COUNT(CASE WHEN DATE(due_date) = CURRENT_DATE AND status != 'completed' THEN 1 END) as due_today
        FROM tasks
        WHERE assigned_to = $1
      `, [id]);

      const performanceRes = await db.query('SELECT performance_score FROM users WHERE id = $1', [id]);

      const stats = staffTasksRes.rows[0];
      const total = parseInt(stats.total) || 0;
      const completed = parseInt(stats.completed) || 0;

      return res.json({
        role: 'staff',
        summary: {
          myTasksCount: total,
          dueTodayCount: parseInt(stats.due_today) || 0,
          overdueCount: parseInt(stats.overdue) || 0,
          completedCount: completed,
          pendingCount: parseInt(stats.pending) + parseInt(stats.in_progress) || 0,
          personalProductivity: parseFloat(performanceRes.rows[0].performance_score) || 100.0
        }
      });
    }
  } catch (err) {
    console.error('Get Dashboard Stats Error:', err);
    return res.status(500).json({ error: 'Internal server error calculating dashboard metrics' });
  }
};

/**
 * Helper to fetch database values for PDF/Excel builders
 */
const retrieveReportData = async (req) => {
  const { id, role, department_id } = req.user;
  const type = req.query.type || 'all';

  let data = {
    role: role.toUpperCase(),
    scope: role === 'manager' ? 'All Departments Summary' : 'Department/Assigned Scope',
    type: type,
    summary: {},
    tasks: [],
    leads: [],
    employees: [],
    projects: [],
    departments: [],
    attendance: [],
    performance: []
  };

  // Base legacy queries (so we always have default task/lead count for summary cards)
  let tasksQuery = `
    SELECT t.*, u.name AS assigned_to_name, d.name AS department_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN departments d ON t.department_id = d.id
  `;
  const params = [];
  if (role === 'team_leader') {
    tasksQuery += ` WHERE t.department_id = $1`;
    params.push(department_id);
  } else if (role === 'staff') {
    tasksQuery += ` WHERE t.assigned_to = $1`;
    params.push(id);
  }
  tasksQuery += ` ORDER BY t.created_at DESC`;
  const tasksRes = await db.query(tasksQuery, params);
  data.tasks = tasksRes.rows;

  let leadsQuery = `
    SELECT l.*, u.name AS assigned_staff_name
    FROM leads l
    LEFT JOIN users u ON l.assigned_staff_id = u.id
  `;
  const leadParams = [];
  if (role === 'staff') {
    leadsQuery += ` WHERE l.assigned_staff_id = $1`;
    leadParams.push(id);
  }
  const leadsRes = await db.query(leadsQuery, leadParams);
  data.leads = leadsRes.rows;

  // Compile default summary stats
  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter(t => t.status === 'completed').length;
  data.summary = {
    totalTasks,
    completedTasks,
    productivityScore: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100
  };

  // Fetch report type specific data
  if (type === 'employee') {
    const empRes = await db.query(`
      SELECT u.employee_id, u.name, u.email, u.phone, u.role, u.designation, u.status, u.joining_date, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.name ASC
    `);
    data.employees = empRes.rows;
  } else if (type === 'project') {
    const projRes = await db.query(`
      SELECT p.*, d.name AS department_name, m.name AS manager_name, tl.name AS team_leader_name
      FROM projects p
      LEFT JOIN departments d ON p.assigned_team_id = d.id
      LEFT JOIN users m ON p.manager_id = m.id
      LEFT JOIN users tl ON p.team_leader_id = tl.id
      ORDER BY p.created_at DESC
    `);
    data.projects = projRes.rows;
  } else if (type === 'department') {
    const deptRes = await db.query(`
      SELECT d.*, 
             COUNT(DISTINCT u.id) AS employee_count,
             COUNT(DISTINCT p.id) AS project_count
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      LEFT JOIN projects p ON d.id = p.assigned_team_id
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    data.departments = deptRes.rows;
  } else if (type === 'attendance') {
    let attQuery = `
      SELECT a.*, u.name AS employee_name, u.employee_id, d.name AS department_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
    `;
    const attParams = [];
    if (role === 'team_leader') {
      attQuery += ` WHERE u.department_id = $1`;
      attParams.push(department_id);
    } else if (role === 'staff') {
      attQuery += ` WHERE a.user_id = $1`;
      attParams.push(id);
    }
    attQuery += ` ORDER BY a.date DESC`;
    const attRes = await db.query(attQuery, attParams);
    data.attendance = attRes.rows;
  } else if (type === 'performance') {
    const perfRes = await db.query(`
      SELECT id, employee_id, name, designation, performance_score
      FROM users
      ORDER BY performance_score DESC
    `);
    data.performance = perfRes.rows;
  }

  return data;
};

/**
 * Exports performance reports to a downloadable PDF document
 */
const exportPDF = async (req, res) => {
  try {
    const reportData = await retrieveReportData(req);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Aspire_Report_${Date.now()}.pdf`);
    
    generateReportPDF(res, reportData);
  } catch (err) {
    console.error('PDF Export Error:', err);
    return res.status(500).json({ error: 'Internal server error exporting PDF document' });
  }
};

/**
 * Exports performance reports to an Excel Worksheet
 */
const exportExcel = async (req, res) => {
  try {
    const reportData = await retrieveReportData(req);
    await generateReportExcel(res, reportData);
  } catch (err) {
    console.error('Excel Export Error:', err);
    return res.status(500).json({ error: 'Internal server error exporting Excel workbook' });
  }
};

module.exports = {
  getDashboardStats,
  exportPDF,
  exportExcel
};
