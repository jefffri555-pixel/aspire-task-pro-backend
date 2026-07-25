const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

router.use(authenticateJWT);

router.get('/', attendanceController.getAttendance);
router.get('/today', attendanceController.getTodayStatus);
router.post('/mark', attendanceController.markAttendance);
router.put('/:id', isAdmin, attendanceController.updateAttendance);

module.exports = router;
