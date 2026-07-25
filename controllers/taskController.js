const db = require('../config/database');
const { uploadAttachment } = require('../config/cloudinary');
const { sendPushNotification } = require('../utils/pushNotification');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

const logTaskHistory = async (taskId, userId, action, oldValue, newValue) => {
  if (isDbOffline()) return;
  try {
    await db.query(`
      INSERT INTO task_history (task_id, user_id, action, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5)
    `, [taskId, userId || null, action, oldValue || null, newValue || null]);
  } catch (err) {
    console.error('Log Task History Error:', err);
  }
};

/**
 * Helper to fetch complete task list with filters and role limitations
 */
const getTasks = async (req, res) => {
  const { role, id, department_id } = req.user;
  const { status, priority, department, search, assignedTo, project_id } = req.query;

  try {
    let query = `
      SELECT t.*, d.name AS department_name, 
             creator.name AS assigned_by_name, 
             assignee.name AS assigned_to_name,
             p.name AS project_name
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users creator ON t.assigned_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN projects p ON t.project_id = p.id
    `;
    
    const conditions = [];
    const params = [];

    // Role-based visibility scoping
    if (role === 'team_leader') {
      conditions.push(`(t.department_id = $${params.length + 1} OR t.assigned_by = $${params.length + 2} OR t.assigned_to = $${params.length + 2})`);
      params.push(department_id, id);
    } else if (role === 'staff') {
      conditions.push(`t.assigned_to = $${params.length + 1}`);
      params.push(id);
    }

    // Direct filters
    if (status) {
      conditions.push(`t.status = $${params.length + 1}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`t.priority = $${params.length + 1}`);
      params.push(priority);
    }
    if (department) {
      conditions.push(`t.department_id = $${params.length + 1}`);
      params.push(department);
    }
    if (assignedTo) {
      conditions.push(`t.assigned_to = $${params.length + 1}`);
      params.push(assignedTo);
    }
    if (project_id) {
      conditions.push(`t.project_id = $${params.length + 1}`);
      params.push(project_id);
    }
    if (search) {
      conditions.push(`(t.title ILIKE $${params.length + 1} OR t.description ILIKE $${params.length + 1} OR t.task_id ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.due_date ASC, t.created_at DESC';

    const tasksRes = await db.query(query, params);
    return res.json(tasksRes.rows);
  } catch (err) {
    console.error('Get Tasks Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching tasks list' });
  }
};

/**
 * Get details, comments, and attachments of a single task
 */
const getTaskById = async (req, res) => {
  const { id } = req.params;

  try {
    const taskQuery = `
      SELECT t.*, d.name AS department_name, 
             creator.name AS assigned_by_name, 
             assignee.name AS assigned_to_name,
             p.name AS project_name
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users creator ON t.assigned_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `;
    const taskRes = await db.query(taskQuery, [id]);

    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskRes.rows[0];

    // Comments query
    const commentsQuery = `
      SELECT c.*, u.name AS user_name, u.role AS user_role, u.designation
      FROM task_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `;
    const commentsRes = await db.query(commentsQuery, [id]);

    // Attachments query
    const attachmentsQuery = `
      SELECT a.*, u.name AS uploaded_by_name
      FROM task_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.task_id = $1
      ORDER BY a.created_at DESC
    `;
    const attachmentsRes = await db.query(attachmentsQuery, [id]);

    task.comments = commentsRes.rows;
    task.attachments = attachmentsRes.rows;

    return res.json(task);
  } catch (err) {
    console.error('Get Task ID Error:', err);
    return res.status(500).json({ error: 'Internal server error details query' });
  }
};

/**
 * Create Task (Manager/TL only)
 */
const createTask = async (req, res) => {
  const { title, description, department_id, priority, start_date, due_date, assigned_to, project_id } = req.body;
  const assigned_by = req.user.id;

  if (!title || !start_date || !due_date) {
    return res.status(400).json({ error: 'Task title, start date, and due date are required' });
  }

  try {
    const insertQuery = `
      INSERT INTO tasks (
        title, description, department_id, priority, status, start_date, due_date, assigned_by, assigned_to, progress_percentage, project_id
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, 0, $9)
      RETURNING *
    `;

    const values = [
      title, description || '', department_id || null, 
      priority || 'medium', start_date, due_date, 
      assigned_by, assigned_to || null, project_id || null
    ];

    const result = await db.query(insertQuery, values);
    const newTask = result.rows[0];

    await logTaskHistory(newTask.id, req.user.id, 'created', null, newTask.title);

    // Save notification to database
    try {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [assigned_to || null, 'New Task Assigned', `Task "${newTask.title}" has been created and assigned.`, 'new_task']
      );
    } catch (nErr) {
      console.error('Notification log error:', nErr);
    }

    // Push notification to target user
    if (assigned_to) {
      await sendPushNotification(
        assigned_to,
        'New Task Assigned',
        `You have been assigned: "${title}" by ${req.user.name}. Due on ${new Date(due_date).toLocaleDateString()}.`,
        { taskId: newTask.id }
      );
    }

    return res.status(201).json(newTask);
  } catch (err) {
    console.error('Create Task Error:', err);
    return res.status(500).json({ error: 'Internal server error creating task' });
  }
};

/**
 * Edit / Update Task details and state transitions
 */
const updateTask = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;
  const { title, description, department_id, priority, start_date, due_date, assigned_to, progress_percentage, status, completion_notes, project_id } = req.body;

  try {
    // 1. Check task exists
    const taskQuery = 'SELECT * FROM tasks WHERE id = $1';
    const taskRes = await db.query(taskQuery, [id]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskRes.rows[0];

    // 2. Authorization check
    if (role === 'staff' && task.assigned_to !== userId) {
      return res.status(403).json({ error: 'Access Denied. This task is not assigned to you.' });
    }

    let finalProgress = progress_percentage !== undefined ? parseInt(progress_percentage) : task.progress_percentage;
    let finalStatus = status || task.status;
    let finalCompletionNotes = completion_notes !== undefined ? completion_notes : task.completion_notes;

    // Automatic status rule changes based on progress percentage
    if (role === 'staff' || role === 'team_leader') {
      if (finalProgress === 0) {
        finalStatus = 'pending';
      } else if (finalProgress > 0 && finalProgress < 100) {
        finalStatus = 'in_progress';
      } else if (finalProgress === 100) {
        // Automatically request review once completed
        if (task.status !== 'completed') {
          finalStatus = 'waiting_for_review';
        }
      }
    }

    // Managers alone can transition review states directly to "completed" or "rejected"
    if (role === 'manager' && status) {
      if (status === 'completed') {
        finalProgress = 100;
      }
      finalStatus = status;
    }

    let updateQuery;
    let values;

    if (role === 'manager' || role === 'team_leader') {
      // Full edits
      updateQuery = `
        UPDATE tasks
        SET title = $1, description = $2, department_id = $3, priority = $4,
            start_date = $5, due_date = $6, assigned_to = $7, progress_percentage = $8,
            status = $9, completion_notes = $10, project_id = $11, updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *
      `;
      values = [
        title || task.title,
        description !== undefined ? description : task.description,
        department_id || task.department_id,
        priority || task.priority,
        start_date || task.start_date,
        due_date || task.due_date,
        assigned_to !== undefined ? assigned_to : task.assigned_to,
        finalProgress,
        finalStatus,
        finalCompletionNotes,
        project_id !== undefined ? project_id : task.project_id,
        id
      ];
    } else {
      // Staff profile updates only progress, status and notes
      updateQuery = `
        UPDATE tasks
        SET progress_percentage = $1, status = $2, completion_notes = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      values = [finalProgress, finalStatus, finalCompletionNotes, id];
    }

    const result = await db.query(updateQuery, values);
    const updatedTask = result.rows[0];

    // Audit logs
    if (task.status !== finalStatus) {
      await logTaskHistory(id, req.user.id, 'status_changed', task.status, finalStatus);
    }
    if (priority && task.priority !== priority) {
      await logTaskHistory(id, req.user.id, 'priority_changed', task.priority, priority);
    }
    if (assigned_to !== undefined && task.assigned_to !== assigned_to) {
      await logTaskHistory(id, req.user.id, 'reassigned', task.assigned_to, assigned_to);
    }
    if (task.progress_percentage !== finalProgress) {
      await logTaskHistory(id, req.user.id, 'progress_updated', `${task.progress_percentage}%`, `${finalProgress}%`);
    }

    // Notification triggers on status changes
    if (task.status !== finalStatus) {
      const recipientId = (role === 'staff') ? task.assigned_by : task.assigned_to;
      if (recipientId) {
        await sendPushNotification(
          recipientId,
          'Task Status Updated',
          `Task "${updatedTask.title}" status changed to: ${finalStatus.toUpperCase()}.`,
          { taskId: updatedTask.id }
        );
      }

      // Save notification to database
      try {
        const notifType = finalStatus === 'completed' ? 'completed_task' : 'system';
        const targetUserId = recipientId || updatedTask.assigned_to || updatedTask.assigned_by;
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [targetUserId || null, 'Task Status Updated', `Task "${updatedTask.title}" status changed to ${finalStatus.toUpperCase()}.`, notifType]
        );
      } catch (nErr) {
        console.error('Notification log error:', nErr);
      }
    }

    return res.json(updatedTask);
  } catch (err) {
    console.error('Update Task Error:', err);
    return res.status(500).json({ error: 'Internal server error updating task' });
  }
};

/**
 * Remove Task (Manager-only)
 */
const deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    const checkRes = await db.query('SELECT title FROM tasks WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    return res.json({ message: `Successfully deleted task: "${checkRes.rows[0].title}"` });
  } catch (err) {
    console.error('Delete Task Error:', err);
    return res.status(500).json({ error: 'Internal server error deleting task' });
  }
};

/**
 * Reassign Task (Manager/TL)
 */
const reassignTask = async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  if (!assigned_to) {
    return res.status(400).json({ error: 'Assignee identifier is required' });
  }

  try {
    const updateQuery = `
      UPDATE tasks 
      SET assigned_to = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const prevRes = await db.query('SELECT assigned_to FROM tasks WHERE id = $1', [id]);
    const oldAssignee = prevRes.rows[0] ? prevRes.rows[0].assigned_to : null;

    const result = await db.query(updateQuery, [assigned_to, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await logTaskHistory(id, req.user.id, 'reassigned', oldAssignee, assigned_to);

    const updatedTask = result.rows[0];

    // Notify new assignee
    await sendPushNotification(
      assigned_to,
      'Task Reassigned to You',
      `You have been assigned task: "${updatedTask.title}" by ${req.user.name}.`,
      { taskId: updatedTask.id }
    );

    return res.json(updatedTask);
  } catch (err) {
    console.error('Reassign Task Error:', err);
    return res.status(500).json({ error: 'Internal server error reassigning task' });
  }
};

/**
 * Duplicate Task (Manager/TL)
 */
const duplicateTask = async (req, res) => {
  const { id } = req.params;

  try {
    const sourceTask = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (sourceTask.rows.length === 0) {
      return res.status(404).json({ error: 'Source task not found' });
    }

    const t = sourceTask.rows[0];
    const insertQuery = `
      INSERT INTO tasks (
        title, description, department_id, priority, status, start_date, due_date, assigned_by, assigned_to, progress_percentage
      )
      VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW() + INTERVAL '3 days', $5, $6, 0)
      RETURNING *
    `;
    const newRes = await db.query(insertQuery, [
      `Copy of - ${t.title}`, t.description, t.department_id, 
      t.priority, req.user.id, t.assigned_to
    ]);

    return res.status(201).json(newRes.rows[0]);
  } catch (err) {
    console.error('Duplicate Task Error:', err);
    return res.status(500).json({ error: 'Internal server error duplicating task' });
  }
};

/**
 * Bulk Assign Task blueprint to multiple staff
 */
const bulkAssignTasks = async (req, res) => {
  const { title, description, department_id, priority, start_date, due_date, assigned_to_list } = req.body;
  const assigned_by = req.user.id;

  if (!title || !assigned_to_list || !Array.isArray(assigned_to_list) || assigned_to_list.length === 0) {
    return res.status(400).json({ error: 'Blueprint title and non-empty array of assignees are required' });
  }

  try {
    const createdTasks = [];

    // Run inside transactions for bulk consistency
    await db.query('BEGIN');
    for (const assigneeId of assigned_to_list) {
      const insertQuery = `
        INSERT INTO tasks (
          title, description, department_id, priority, status, start_date, due_date, assigned_by, assigned_to, progress_percentage
        )
        VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, 0)
        RETURNING *
      `;
      const result = await db.query(insertQuery, [
        title, description || '', department_id || null, 
        priority || 'medium', start_date, due_date, 
        assigned_by, assigneeId
      ]);
      
      const t = result.rows[0];
      createdTasks.push(t);

      // Trigger Notification
      await sendPushNotification(
        assigneeId,
        'Bulk Task Assignment',
        `You have been assigned: "${title}" as part of a team project. Due on ${new Date(due_date).toLocaleDateString()}.`,
        { taskId: t.id }
      );
    }
    await db.query('COMMIT');

    return res.status(201).json({
      message: `Successfully created and distributed ${createdTasks.length} tasks.`,
      tasks: createdTasks
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Bulk Assign Tasks Error:', err);
    return res.status(500).json({ error: 'Internal server error executing bulk assign operations' });
  }
};

/**
 * Comments Handler
 */
const addComment = async (req, res) => {
  const { id } = req.params; // Task ID
  const { comment } = req.body;
  const userId = req.user.id;

  if (!comment) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }

  try {
    // Check access
    const checkRes = await db.query('SELECT title, assigned_by, assigned_to FROM tasks WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const t = checkRes.rows[0];

    const insertQuery = `
      INSERT INTO task_comments (task_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const commentRes = await db.query(insertQuery, [id, userId, comment]);
    const newComment = commentRes.rows[0];
    
    // Fetch user details for UI insertion convenience
    const uRes = await db.query('SELECT name, role, designation FROM users WHERE id = $1', [userId]);
    newComment.user_name = uRes.rows[0].name;
    newComment.user_role = uRes.rows[0].role;
    newComment.designation = uRes.rows[0].designation;

    // Send notifications to other actors
    const notifyId = (userId === t.assigned_to) ? t.assigned_by : t.assigned_to;
    if (notifyId) {
      await sendPushNotification(
        notifyId,
        'New Comment on Task',
        `${req.user.name} commented on "${t.title}": "${comment.substring(0, 30)}..."`,
        { taskId: id }
      );
    }

    return res.status(201).json(newComment);
  } catch (err) {
    console.error('Add Comment Error:', err);
    return res.status(500).json({ error: 'Internal server error adding comment' });
  }
};

/**
 * Attachments Handler
 */
const addAttachment = async (req, res) => {
  const { id } = req.params; // Task ID
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'Attachment file is required' });
  }

  try {
    // Check task
    const checkRes = await db.query('SELECT title, assigned_by, assigned_to FROM tasks WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Upload using Cloudinary or mock fallback helper
    const uploadRes = await uploadAttachment(req.file);

    const insertQuery = `
      INSERT INTO task_attachments (task_id, file_url, file_name, uploaded_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const attachRes = await db.query(insertQuery, [id, uploadRes.url, req.file.originalname, userId]);
    const newAttachment = attachRes.rows[0];
    newAttachment.uploaded_by_name = req.user.name;

    return res.status(201).json(newAttachment);
  } catch (err) {
    console.error('Add Attachment Error:', err);
    return res.status(500).json({ error: 'Internal server error uploading document attachment' });
  }
};

const getTaskHistory = async (req, res) => {
  const { id } = req.params;

  if (isDbOffline()) {
    return res.json([
      { id: '1', action: 'created', new_value: 'Task initialized', created_at: new Date().toISOString(), user_name: 'Super Admin' }
    ]);
  }

  try {
    const query = `
      SELECT h.*, u.name AS user_name 
      FROM task_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.task_id = $1
      ORDER BY h.created_at DESC
    `;
    const result = await db.query(query, [id]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get Task History Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching task history logs' });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  reassignTask,
  duplicateTask,
  bulkAssignTasks,
  addComment,
  addAttachment,
  getTaskHistory
};
