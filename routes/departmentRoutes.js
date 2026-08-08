const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Require authentication for all department routes
router.use(authenticateJWT);

const canManageDept = authorizeRoles(['admin', 'super_admin', 'manager', 'managing_director']);

// Publicly read, Manager/Admin-restricted write
router.get('/', departmentController.getDepartments);
router.post('/', canManageDept, departmentController.createDepartment);
router.put('/:id', canManageDept, departmentController.updateDepartment);
router.patch('/:id/status', canManageDept, departmentController.toggleStatus);
router.delete('/:id', authorizeRoles(['admin', 'super_admin']), departmentController.deleteDepartment);

// Team assignments & Statistics extensions
router.post('/:id/assign', canManageDept, departmentController.assignEmployees);
router.get('/:id/statistics', departmentController.getDepartmentStats);

module.exports = router;
