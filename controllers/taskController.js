const db = require('../config/database');
const { uploadAttachment, uploadAudio } = require('../config/cloudinary');
const { sendPushNotification } = require('../utils/pushNotification');
const { notifyLeadTrackingSystem } = require('../services/leadTrackingNotificationService');

const isDbOffline = () => db.isConnectionFailed && db.isConnectionFailed();

const logTaskHistory = async (taskId, userId, action, oldValue, newValue, client = null) => {
  if (isDbOffline()) return;
  try {
    const executor = client || db;
    await executor.query(`
      INSERT INTO task_history (task_id, user_id, action, old_value, new_value)
      VALUES ($1, $2, $3, $4, $5)
    `, [taskId, userId || null, action, oldValue || null, newValue || null]);
  } catch (err) {
    console.error('Log Task History Error:', err);
    if (client) throw err;
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

const normalizeUuid = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 'null' ||
    value === 'undefined'
  ) {
    return null;
  }
  return value;
};

const isValidUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const normalizeAudioMimeType = (originalMime, fileName) => {
  const path = require('path');
  const extension = path.extname(fileName || '').toLowerCase();

  if (originalMime && originalMime !== 'application/octet-stream') {
    return originalMime;
  }

  switch (extension) {
    case '.webm':
      return 'audio/webm';
    case '.ogg':
      return 'audio/ogg';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
    case '.mp4':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    case '.aac':
      return 'audio/aac';
    default:
      return 'application/octet-stream';
  }
};

const canAssignToRole = (assignerRole, assigneeRole) => {
  if (assignerRole === 'super_admin' || assignerRole === 'admin') return true;
  if (assignerRole === 'manager') return ['managing_director', 'team_leader', 'staff'].includes(assigneeRole);
  if (assignerRole === 'managing_director') return ['team_leader', 'staff'].includes(assigneeRole);
  if (assignerRole === 'team_leader') return ['staff'].includes(assigneeRole);
  return false;
};

/**
 * Create Task (Manager/TL only)
 */
const createTask = async (req, res) => {
  const { priority, start_date, due_date } = req.body;
  const title = req.body.title || '';
  const description = req.body.description || '';
  const title_audio_duration_seconds = parseInt(req.body.title_audio_duration_seconds || '0', 10);
  const description_audio_duration_seconds = parseInt(req.body.description_audio_duration_seconds || '0', 10);

  const titleAudioFile = req.files?.title_audio?.[0];
  const descAudioFile = req.files?.description_audio?.[0];

  const department_id = normalizeUuid(req.body.department_id);
  const assigned_to = normalizeUuid(req.body.assigned_to);
  const project_id = normalizeUuid(req.body.project_id);
  const assigned_by = normalizeUuid(req.user.id);

  if (!start_date || !due_date) {
    return res.status(400).json({ error: 'Start date and due date are required' });
  }

  if (!title && !titleAudioFile) {
    return res.status(400).json({ error: 'Task title or title voice note is required' });
  }

  if (!description && !descAudioFile) {
    return res.status(400).json({ error: 'Task description or description voice note is required' });
  }

  if (department_id && !isValidUuid(department_id)) {
    return res.status(400).json({ success: false, message: 'Invalid department ID' });
  }
  if (assigned_to && !isValidUuid(assigned_to)) {
    return res.status(400).json({ success: false, message: 'Invalid assigned employee ID' });
  }
  if (project_id && !isValidUuid(project_id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }
  if (assigned_by && !isValidUuid(assigned_by)) {
    return res.status(400).json({ success: false, message: 'Invalid assigned_by user ID' });
  }

  try {
    if (assigned_to) {
      const assigneeRes = await db.query('SELECT role FROM users WHERE id = $1', [assigned_to]);
      if (assigneeRes.rows.length > 0) {
        const assigneeRole = assigneeRes.rows[0].role;
        if (!canAssignToRole(req.user.role, assigneeRole)) {
          return res.status(403).json({ error: 'You do not have permission to assign a task to this role.' });
        }
      }
    }

    let titleAudioUrl = null;
    let titleAudioFileName = null;
    let titleAudioMimeType = null;
    let titleAudioDuration = null;

    let descAudioUrl = null;
    let descAudioFileName = null;
    let descAudioMimeType = null;
    let descAudioDuration = null;

    if (titleAudioFile) {
      const uploadRes = await uploadAudio(titleAudioFile);
      titleAudioUrl = uploadRes.url;
      titleAudioFileName = titleAudioFile.originalname;
      titleAudioMimeType = normalizeAudioMimeType(titleAudioFile.mimetype, titleAudioFileName);
      titleAudioDuration = title_audio_duration_seconds;
    }

    if (descAudioFile) {
      const uploadRes = await uploadAudio(descAudioFile);
      descAudioUrl = uploadRes.url;
      descAudioFileName = descAudioFile.originalname;
      descAudioMimeType = normalizeAudioMimeType(descAudioFile.mimetype, descAudioFileName);
      descAudioDuration = description_audio_duration_seconds;
    }

    const insertQuery = `
      INSERT INTO tasks (
        title, description, department_id, priority, status, start_date, due_date, assigned_by, assigned_to, progress_percentage, project_id,
        title_audio_url, title_audio_file_name, title_audio_mime_type, title_audio_duration_seconds,
        description_audio_url, description_audio_file_name, description_audio_mime_type, description_audio_duration_seconds
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      title, description, department_id || null,
      priority || 'medium', start_date, due_date,
      assigned_by, assigned_to || null, project_id || null,
      titleAudioUrl, titleAudioFileName, titleAudioMimeType, titleAudioDuration,
      descAudioUrl, descAudioFileName, descAudioMimeType, descAudioDuration
    ];

    const result = await db.query(insertQuery, values);
    const newTask = result.rows[0];

    const taskLogTitle = newTask.title || 'Voice Task';
    
    // Trigger webhook asynchronously
    notifyLeadTrackingSystem('TASK_ASSIGNED', newTask);

    await logTaskHistory(newTask.id, req.user.id, 'task_created', null, `Task created: ${taskLogTitle}`);

    if (titleAudioFile) {
      await logTaskHistory(newTask.id, req.user.id, 'task_created', null, 'Task created with title voice note');
    }
    if (descAudioFile) {
      await logTaskHistory(newTask.id, req.user.id, 'task_created', null, 'Task created with description voice note');
    }

    // Save notification to database
    try {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
        [assigned_to || null, 'New Task Assigned', `Task "${taskLogTitle}" has been created and assigned.`, 'new_task']
      );
    } catch (nErr) {
      console.error('Notification log error:', nErr);
    }

    // Push notification to target user
    if (assigned_to) {
      await sendPushNotification(
        assigned_to,
        'New Task Assigned',
        `You have been assigned: "${taskLogTitle}" by ${req.user.name}. Due on ${new Date(due_date).toLocaleDateString()}.`,
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

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(updateQuery, values);
      const updatedTask = result.rows[0];

      // Audit logs
      if (task.status !== finalStatus) {
        await logTaskHistory(id, req.user.id, 'status_changed', task.status, finalStatus, client);
      }
      if (priority && task.priority !== priority) {
        await logTaskHistory(id, req.user.id, 'priority_changed', task.priority, priority, client);
      }
      if (assigned_to !== undefined && task.assigned_to !== assigned_to) {
        await logTaskHistory(id, req.user.id, 'reassigned', task.assigned_to, assigned_to, client);
      }
      if (task.progress_percentage !== finalProgress) {
        await logTaskHistory(id, req.user.id, 'progress_updated', `${task.progress_percentage}%`, `${finalProgress}%`, client);
      }

      // Notification triggers on status changes
      if (task.status !== finalStatus) {
        const recipientId = (role === 'staff') ? task.assigned_by : task.assigned_to;
        if (recipientId) {
          // Push notification happens outside transaction to avoid blocking, but wait until commit is safe?
          // Since it's external, we'll keep it here.
          sendPushNotification(
            recipientId,
            'Task Status Updated',
            `Task "${updatedTask.title}" status changed to: ${finalStatus.toUpperCase()}.`,
            { taskId: updatedTask.id }
          ).catch(e => console.error(e));
        }

        // Save notification to database
        const notifType = finalStatus === 'completed' ? 'completed_task' : 'system';
        const targetUserId = recipientId || updatedTask.assigned_to || updatedTask.assigned_by;
        await client.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [targetUserId || null, 'Task Status Updated', `Task "${updatedTask.title}" status changed to ${finalStatus.toUpperCase()}.`, notifType]
        );
      }

      await client.query('COMMIT');
      
      // Trigger Lead Tracking Webhook
      if (task.status !== finalStatus && finalStatus === 'completed') {
        notifyLeadTrackingSystem('TASK_COMPLETED', updatedTask);
      } else if (task.status !== finalStatus) {
        notifyLeadTrackingSystem('TASK_STATUS_CHANGED', updatedTask);
      } else {
        notifyLeadTrackingSystem('TASK_UPDATED', updatedTask);
      }
      
      return res.json(updatedTask);
    } catch (txnErr) {
      await client.query('ROLLBACK');
      throw txnErr;
    } finally {
      client.release();
    }
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
      return res.status(200).json({ success: true, message: 'Task already deleted' });
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete Task Error:', err);
    return res.status(500).json({ success: false, message: 'Unable to delete task. Please try again.' });
  }
};

/**
 * Reassign Task (Manager/TL)
 */
const assignTask = async (req, res) => {
  const taskId = req.params.id;
  const assignedTo = req.body.assigned_to;
  const assignedBy = req.user?.id;

  console.log('Assign task request params:', req.params);
  console.log('Assign task request body:', req.body);
  console.log('Logged-in user:', req.user);

  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Task ID is required' });
  }

  if (!assignedTo) {
    return res.status(400).json({ success: false, message: 'Assigned employee ID is required' });
  }

  if (!assignedBy) {
    return res.status(401).json({ success: false, message: 'Authenticated user ID is missing' });
  }

  try {
    const prevRes = await db.query('SELECT assigned_to, status FROM tasks WHERE id = $1', [taskId]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const assigneeRes = await db.query('SELECT role FROM users WHERE id = $1', [assignedTo]);
    if (assigneeRes.rows.length > 0) {
      const assigneeRole = assigneeRes.rows[0].role;
      if (!canAssignToRole(req.user.role, assigneeRole)) {
        return res.status(403).json({ success: false, message: 'You do not have permission to assign a task to this role.' });
      }
    }

    const oldAssignee = prevRes.rows[0].assigned_to;
    let newStatus = prevRes.rows[0].status;
    if (!newStatus || newStatus === 'assigned') newStatus = 'pending';

    const updateQuery = `
      UPDATE tasks 
      SET assigned_to = $1, assigned_by = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $4 
      RETURNING *
    `;

    const result = await db.query(updateQuery, [assignedTo, assignedBy, newStatus, taskId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Task not found during update' });
    }

    // Fetch joined names for the UI response
    const nameQuery = `
      SELECT t.*, 
             creator.name AS assigned_by_name, 
             assignee.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users creator ON creator.id = t.assigned_by
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      WHERE t.id = $1
    `;
    const finalRes = await db.query(nameQuery, [taskId]);
    const updatedTask = finalRes.rows[0];

    const assignAction = oldAssignee ? 'task_reassigned' : 'task_assigned';
    await logTaskHistory(taskId, assignedBy, assignAction, oldAssignee, assignedTo);
    
    // Trigger webhook for assignment
    notifyLeadTrackingSystem('TASK_ASSIGNED', updatedTask);

    // Notify new assignee
    try {
      if (typeof sendPushNotification === 'function') {
        await sendPushNotification(
          assignedTo,
          'Task Assigned to You',
          `You have been assigned task: "${updatedTask.title}" by ${req.user.name}.`,
          { taskId: updatedTask.id }
        );
      }
    } catch (pushErr) {
      console.error('Failed to send push notification:', pushErr);
    }

    return res.json({
      success: true,
      message: 'Task assigned successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Assign task controller error:', error);
    console.error('PostgreSQL code:', error.code);
    console.error('PostgreSQL detail:', error.detail);
    console.error('PostgreSQL constraint:', error.constraint);

    return res.status(500).json({
      success: false,
      message: 'Failed to assign task',
      error: process.env.NODE_ENV === 'development'
        ? error.message
        : undefined
    });
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
 * Voice Messages Handler
 */
const addVoiceMessage = async (req, res) => {
  const { id } = req.params; // Task ID
  const userId = req.user.id;
  const durationSeconds = parseInt(req.body.duration_seconds || '0', 10);

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    // Check access
    const checkRes = await db.query('SELECT title, assigned_by, assigned_to FROM tasks WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const t = checkRes.rows[0];

    // Upload audio using Cloudinary or mock fallback helper
    const uploadRes = await uploadAudio(req.file);

    const insertQuery = `
  INSERT INTO task_comments (
    task_id,
    user_id,
    comment,
    message_type,
    audio_url,
    audio_file_name,
    audio_mime_type,
    audio_duration_seconds
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *
`;
    const commentRes = await db.query(insertQuery, [
      id,
      userId,
      'Voice message',
      'voice',
      uploadRes.url,
      req.file.originalname,
      req.file.mimetype,
      durationSeconds
    ]);
    const newComment = commentRes.rows[0];

    // Fetch user details for UI insertion convenience
    const uRes = await db.query('SELECT name, role, designation FROM users WHERE id = $1', [userId]);
    newComment.user_name = uRes.rows[0].name;
    newComment.user_role = uRes.rows[0].role;
    newComment.designation = uRes.rows[0].designation;

    await logTaskHistory(id, userId, 'voice_message_sent', null, `Voice message sent — ${durationSeconds} seconds`);

    // Send notifications to other actors
    const notifyId = (userId === t.assigned_to) ? t.assigned_by : t.assigned_to;
    if (notifyId) {
      await sendPushNotification(
        notifyId,
        'New Voice Message on Task',
        `${req.user.name} sent a voice message on "${t.title}"`,
        { taskId: id }
      );
    }

    return res.status(201).json(newComment);
  } catch (err) {
    console.error('Add Voice Message Error:', err);
    return res.status(500).json({ error: 'Internal server error adding voice message' });
  }
};

/**
 * Attachments Handler
 */
const addAttachment = async (req, res) => {
  const { id } = req.params; // Task ID
  const userId = req.user.id;
  const role = req.user.role;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file selected' });
  }

  try {
    // Check task
    const checkRes = await db.query('SELECT title, assigned_by, assigned_to FROM tasks WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const task = checkRes.rows[0];

    // Check Authorization
    const allowedRoles = ['super_admin', 'admin', 'manager', 'managing_director', 'team_leader'];
    let isAuthorized = allowedRoles.includes(role);

    if (role === 'staff') {
      if (task.assigned_to === userId || task.assigned_by === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
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

    await logTaskHistory(id, userId, 'file_uploaded', null, req.file.originalname);

    return res.status(201).json(newAttachment);
  } catch (err) {
    console.error('Add Attachment Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error uploading document attachment' });
  }
};

const downloadAttachment = async (req, res) => {
  try {
    const { id: taskId, attachmentId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    console.log('DOWNLOAD REQUEST', {
      taskId,
      attachmentId,
      user: req.user
    });

    const attachmentRes = await db.query(
      `SELECT id, task_id, file_url, file_name, uploaded_by 
       FROM task_attachments 
       WHERE id = $1 AND task_id = $2`,
      [attachmentId, taskId]
    );

    if (attachmentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }
    const attachment = attachmentRes.rows[0];

    const taskRes = await db.query('SELECT assigned_by, assigned_to FROM tasks WHERE id = $1', [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const task = taskRes.rows[0];

    // Manager and above can download any attachment if they have access to the task.
    // Assuming 'super_admin', 'admin', 'manager', 'team_leader' have access to all tasks they can view.
    const allowedRoles = ['super_admin', 'admin', 'manager', 'managing_director', 'team_leader'];
    let isAuthorized = allowedRoles.includes(role);

    if (role === 'staff') {
      if (task.assigned_to === userId || task.assigned_by === userId || attachment.uploaded_by === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const path = require('path');
    const fs = require('fs');

    if (attachment.file_url.startsWith('/uploads/')) {
      const storedName = path.basename(attachment.file_url);
      const absolutePath = path.join(__dirname, '..', 'uploads', storedName);

      console.log('Resolved download path:', absolutePath);
      console.log('File exists:', fs.existsSync(absolutePath));

      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ success: false, message: 'File not found on server' });
      }

      await logTaskHistory(taskId, userId, 'file_downloaded', null, attachment.file_name);
      return res.download(absolutePath, attachment.file_name);
    } else {
      // Cloudinary or other external URLs
      const https = require('https');
      https.get(attachment.file_url, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          logTaskHistory(taskId, userId, 'file_downloaded', null, attachment.file_name).catch(err => console.error('Error logging external file download:', err));
        }
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        response.pipe(res);
      }).on('error', (err) => {
        console.error('Download Attachment Proxy Error:', err);
        return res.status(500).json({ success: false, message: 'Error downloading file' });
      });
    }
  } catch (error) {
    console.error('Download attachment error:', error);
    return res.status(500).json({ success: false, message: error.message });
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
      SELECT h.*, u.name AS user_name, u.role AS user_role
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

const getEmployeeTaskHistory = async (req, res) => {
  const employeeId = req.params.id;
  const { role, department_id } = req.user;

  try {
    // 1. Fetch employee details
    const empQuery = `
      SELECT u.id, u.employee_id AS employee_code, u.name, u.designation, 
             u.department_id, d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `;
    const empRes = await db.query(empQuery, [employeeId]);

    if (empRes.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = empRes.rows[0];

    // 2. Enforce Team Leader permissions
    if (role === 'team_leader' && employee.department_id !== department_id) {
      return res.status(403).json({ error: 'Access Denied. Employee is not in your department.' });
    }

    // 3. Fetch all tasks assigned to the employee
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
      WHERE t.assigned_to = $1
      ORDER BY t.due_date ASC, t.created_at DESC
    `;
    const tasksRes = await db.query(taskQuery, [employeeId]);
    const tasks = tasksRes.rows;

    // 4. Calculate Summary
    const summary = {
      total: tasks.length,
      completed: 0,
      pending: 0,
      in_progress: 0,
      waiting_for_review: 0
    };

    for (const t of tasks) {
      if (t.status === 'completed') summary.completed++;
      else if (t.status === 'pending') summary.pending++;
      else if (t.status === 'in_progress') summary.in_progress++;
      else if (t.status === 'waiting_for_review') summary.waiting_for_review++;
    }

    return res.json({
      employee,
      summary,
      tasks
    });
  } catch (err) {
    console.error('Get Employee Task History Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching employee tasks' });
  }
};

const markTaskAsCompleted = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const role = String(req.user.role || '')
      .trim()
      .toLowerCase();

    console.log('MARK TASK STATUS REQUEST', {
      taskId,
      userId,
      role
    });

    const taskResult = await db.query(
      `
      SELECT *
      FROM tasks
      WHERE id = $1
      `,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const task = taskResult.rows[0];

    const managerRoles = [
      'manager',
      'admin',
      'super_admin',
      'superadmin'
    ];

    const teamLeaderRoles = [
      'team_leader',
      'teamleader',
      'tl'
    ];

    const staffRoles = [
      'staff',
      'employee'
    ];

    let newStatus;
    let actionMessage;

    if (
      staffRoles.includes(role) ||
      teamLeaderRoles.includes(role)
    ) {
      if (task.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Task is already completed'
        });
      }

      if (task.status === 'in_review') {
        return res.status(400).json({
          success: false,
          message: 'Task is already submitted for review'
        });
      }

      if (
        staffRoles.includes(role) &&
        String(task.assigned_to) !== String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this task'
        });
      }

      newStatus = 'in_review';
      actionMessage = 'Task submitted for manager review';
    } else if (managerRoles.includes(role)) {
      if (task.status !== 'in_review') {
        return res.status(400).json({
          success: false,
          message: 'Task must be In Review before completion'
        });
      }

      newStatus = 'completed';
      actionMessage = 'Task approved and completed';
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task'
      });
    }

    const updateResult = await db.query(
      `
      UPDATE tasks
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [newStatus, taskId]
    );

    const actionMessageLog = newStatus === 'in_review' ? 'submitted_for_review' : 'task_completed';
    await logTaskHistory(taskId, userId, actionMessageLog, task.status, newStatus);

    if (newStatus === 'in_review') {
      try {
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [task.assigned_by, 'Task Submitted for Review', `Task "${task.title}" has been submitted for review.`, 'task_review']
        );
        await sendPushNotification(
          task.assigned_by,
          'Task Submitted for Review',
          `Task "${task.title}" has been submitted for review.`,
          { taskId }
        );
      } catch (nErr) {
        console.error('Notification log error:', nErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: actionMessage,
      task: updateResult.rows[0]
    });
  } catch (error) {
    console.error('MARK TASK STATUS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to update task status'
    });
  }
};

const getCalendarTasks = async (req, res) => {
  const { role, id, department_id } = req.user;
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT t.id, t.task_id, t.title, t.description, t.due_date, t.status, t.priority,
             d.name AS department_name, 
             creator.name AS assigned_by_name, 
             assignee.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users creator ON t.assigned_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
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

    if (start_date) {
      conditions.push(`t.due_date >= $${params.length + 1}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`t.due_date <= $${params.length + 1}`);
      params.push(end_date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.due_date ASC';

    const tasksRes = await db.query(query, params);
    
    const normalizedTasks = tasksRes.rows.map(task => {
      let status = task.status;
      if (!['pending', 'in_progress', 'in_review', 'waiting_for_review', 'completed'].includes(status)) {
         status = 'pending'; 
      }
      return {
        ...task,
        status,
        due_date: task.due_date ? new Date(task.due_date.getTime() - (task.due_date.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : null
      };
    });

    return res.json(normalizedTasks);
  } catch (err) {
    console.error('Get Calendar Tasks Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching calendar tasks' });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  duplicateTask,
  bulkAssignTasks,
  addComment,
  addVoiceMessage,
  addAttachment,
  downloadAttachment,
  getTaskHistory,
  getEmployeeTaskHistory,
  markTaskAsCompleted,
  getCalendarTasks
};
