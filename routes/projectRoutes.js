const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

// Protect all routes
router.use(authenticateJWT);

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);

// Create project (Manager only)
router.post('/', authorizeRoles(['manager', 'managing_director']), projectController.createProject);

// Update project (Manager & Team Leader)
router.put('/:id', authorizeRoles(['manager', 'managing_director', 'team_leader']), projectController.updateProject);

// Delete project (Manager only)
router.delete('/:id', authorizeRoles(['manager', 'managing_director']), projectController.deleteProject);

module.exports = router;
