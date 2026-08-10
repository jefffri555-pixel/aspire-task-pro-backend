const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const audioUpload = require('../middleware/audioUploadMiddleware');

// Protect all routes
router.use(authenticateJWT);

// Retrieve and query
router.get('/', taskController.getTasks);
router.get('/calendar', taskController.getCalendarTasks);
router.get('/:id', taskController.getTaskById);

// Create task restricted to Managers and Team Leaders
router.post(
  '/',
  authorizeRoles(['manager', 'managing_director', 'team_leader']),
  audioUpload.fields([
    { name: 'title_audio', maxCount: 1 },
    { name: 'description_audio', maxCount: 1 }
  ]),
  taskController.createTask
);

// Update status/progress/details
router.put('/:id', taskController.updateTask);

// Delete task restricted to Admin and Manager
router.delete('/:id', authorizeRoles(['admin', 'manager']), taskController.deleteTask);

// Lifecycle actions (Manager/TL only)
router.patch('/:id/assign', authorizeRoles(['manager', 'managing_director', 'team_leader']), taskController.assignTask);
router.post('/:id/duplicate', authorizeRoles(['manager', 'managing_director', 'team_leader']), taskController.duplicateTask);
router.post('/bulk-assign', authorizeRoles(['manager', 'managing_director', 'team_leader']), taskController.bulkAssignTasks);

// Completion Workflow
router.patch('/:taskId/mark-completed', taskController.markTaskAsCompleted);

// Interactive extensions
router.post('/:id/comments', taskController.addComment);
router.post('/:id/voice-messages', audioUpload.single('audio'), taskController.addVoiceMessage);
router.post('/:id/attachments', upload.single('file'), taskController.addAttachment);
router.get('/:id/attachments/:attachmentId/download', taskController.downloadAttachment);
router.get('/:id/history', taskController.getTaskHistory);

module.exports = router;
