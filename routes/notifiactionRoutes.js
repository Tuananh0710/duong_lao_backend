const express = require('express');
const router = express.Router();
const NotificationController = require('../controller/notificationController');
const {authenticate} = require('../middlewares/auth');

// Tất cả routes đều cần xác thực
router.use(authenticate);

// Lưu FCM token
router.post('/token', NotificationController.saveToken);

// Lấy danh sách thông báo
router.get('/', NotificationController.getNotifications);

// Đánh dấu đã đọc
router.put('/:id/read', NotificationController.markAsRead);

module.exports = router;