const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Protect all routes
router.use(authenticateJWT);

// Retrieve and query
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);

// Create task restricted to Managers and Team Leaders
router.post('/', authorizeRoles(['manager', 'team_leader']), taskController.createTask);

// Update status/progress/details
router.put('/:id', taskController.updateTask);

// Delete task restricted to Managers
router.delete('/:id', authorizeRoles(['manager']), taskController.deleteTask);

// Lifecycle actions (Manager/TL only)
router.post('/:id/reassign', authorizeRoles(['manager', 'team_leader']), taskController.reassignTask);
router.post('/:id/duplicate', authorizeRoles(['manager', 'team_leader']), taskController.duplicateTask);
router.post('/bulk-assign', authorizeRoles(['manager', 'team_leader']), taskController.bulkAssignTasks);

// Interactive extensions
router.post('/:id/comments', taskController.addComment);
router.post('/:id/attachments', upload.single('file'), taskController.addAttachment);
router.get('/:id/history', taskController.getTaskHistory);

module.exports = router;
