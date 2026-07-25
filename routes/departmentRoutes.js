const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

// Require authentication for all department routes
router.use(authenticateJWT);

// Publicly read, Admin-restricted write
router.get('/', departmentController.getDepartments);
router.post('/', isAdmin, departmentController.createDepartment);
router.put('/:id', isAdmin, departmentController.updateDepartment);
router.delete('/:id', isAdmin, departmentController.deleteDepartment);

// Team assignments & Statistics extensions
router.post('/:id/assign', isAdmin, departmentController.assignEmployees);
router.get('/:id/statistics', departmentController.getDepartmentStats);

module.exports = router;
