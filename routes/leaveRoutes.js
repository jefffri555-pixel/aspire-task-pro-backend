const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const leaveController = require('../controllers/leaveController');

// All routes require authentication
router.use(authenticateJWT);

router.post('/', leaveController.createRequest);
router.get('/', leaveController.getRequests);
router.put('/:id/review', leaveController.reviewRequest);

module.exports = router;
