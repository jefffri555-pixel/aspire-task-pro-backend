const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all user routes
router.use(authenticateJWT);

const taskController = require('../controllers/taskController');

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.get('/:id/tasks', authorizeRoles(['admin', 'super_admin', 'manager', 'managing_director', 'team_leader']), taskController.getEmployeeTaskHistory);

// Create, Update, Delete restricted to Manager role
router.post('/', authorizeRoles(['manager', 'managing_director']), userController.createUser);
router.put('/:id', userController.updateUser); // Controller has check to let users update their own details
router.delete('/:id', authorizeRoles(['manager', 'managing_director']), userController.deleteUser);

module.exports = router;
