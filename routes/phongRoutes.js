const express = require('express');
const router = express.Router();
const phongController = require('../controller/phongController');
const {authenticate} = require('../middlewares/auth');

// Tất cả routes đều cần xác thực
router.use(authenticate);
router.get('/', phongController.getAll);


module.exports = router;