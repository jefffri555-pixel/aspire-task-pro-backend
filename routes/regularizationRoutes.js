const express = require('express');
const router = express.Router();
const regularizationController = require('../controllers/regularizationController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authenticateJWT);

router.post('/', upload.single('attachment'), regularizationController.createRequest);
router.get('/my-requests', regularizationController.getMyRequests);
router.get('/all', regularizationController.getAllRequests);
router.put('/:id/status', regularizationController.updateStatus);

module.exports = router;
