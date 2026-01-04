// controllers/notificationController.js
const FCMToken = require('../models/fcmToken');
const Notification = require('../models/ThongBao');

class NotificationController {
  // Lưu FCM token
  static async saveToken(req, res) {
    try {
      const user = req.user; // từ middleware auth
      
      console.log('🔍 User from middleware:', user); // Debug
      
      // DÙNG user.id_tai_khoan THAY VÌ user.id
      const userId = user.id_tai_khoan;
      
      const { token, device_type = 'android', app_type } = req.body;
      console.log('🎯 Received FCM token from user:', userId);
      console.log('   Token:', token?.substring(0, 20) + '...');
      console.log('   Device type:', device_type);
      console.log('   App type:', app_type);
      console.log('   User role:', req.user.vai_tro);
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token không được để trống'
        });
      }
      
      // VALIDATION: Kiểm tra app_type hợp lệ
      const validAppTypes = ['nurse_app', 'family_app'];
      if (!validAppTypes.includes(app_type)) {
        return res.status(400).json({
          success: false,
          message: 'app_type không hợp lệ. Phải là nurse_app hoặc family_app'
        });
      }
      
      // VALIDATION: Kiểm tra role vs app_type
      if (app_type === 'nurse_app') {
        // Chỉ các role điều dưỡng, quản lý được dùng nurse_app
        const allowedRoles = ['super_admin', 'quan_ly_y_te', 'quan_ly_nhan_su', 'dieu_duong', 'dieu_duong_truong', 'marketing'];``
        if (!allowedRoles.includes(user.vai_tro)) {
          return res.status(400).json({
            success: false,
            message: `Role ${user.vai_tro} không được dùng nurse_app`
          });
        }
      }
      
      if (app_type === 'family_app' && user.vai_tro !== 'nguoi_nha') {
        return res.status(400).json({
          success: false,
          message: 'Chỉ người nhà (nguoi_nha) được dùng family_app'
        });
      }
      
      // Lưu token
      await FCMToken.saveToken(userId, token, device_type, app_type, user.vai_tro);
      
      res.json({ 
        success: true, 
        message: 'Đã lưu token thành công',
        data: {
          userId: userId,
          appType: app_type,
          deviceType: device_type
        }
      });
      
    } catch (error) {
      console.error('Error saving token:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi lưu token: ' + error.message
      });
    }
  }

  
  // Lấy danh sách thông báo
  static async getNotifications(req, res) {
    try {
      const user = req.user;
      const limit = parseInt(req.query.limit) || 20;
      
      const notifications = await Notification.getByUser(user.id, limit);
      
      res.json({
        success: true,
        data: notifications
      });
      
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống'
      });
    }
  }
  
  // Đánh dấu đã đọc
  static async markAsRead(req, res) {
    try {
      const user = req.user;
      const notificationId = req.params.id;
      
      await Notification.markAsRead(notificationId, user.id);
      
      res.json({
        success: true,
        message: 'Đã đánh dấu đã đọc'
      });
      
    } catch (error) {
      console.error('Error marking as read:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống'
      });
    }
  }
}

module.exports = NotificationController;