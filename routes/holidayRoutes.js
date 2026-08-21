const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Protect all routes
router.use(authenticateJWT);

router.get('/', holidayController.getAllHolidays);
router.post('/', holidayController.createHoliday);
router.put('/:id', holidayController.updateHoliday);
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;
