const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

router.use(authenticateJWT);

router.get('/', leaveController.getLeaves);
router.post('/', leaveController.createLeaveRequest);
router.put('/:id', isAdmin, leaveController.updateLeaveRequest);

module.exports = router;
