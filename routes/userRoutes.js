const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all user routes
router.use(authenticateJWT);

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

// Create, Update, Delete restricted to Manager role
router.post('/', authorizeRoles(['manager']), userController.createUser);
router.put('/:id', userController.updateUser); // Controller has check to let users update their own details
router.delete('/:id', authorizeRoles(['manager']), userController.deleteUser);

module.exports = router;
