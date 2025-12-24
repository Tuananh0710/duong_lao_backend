// controllers/visitController.js
const Visit = require('../models/lichThamBenh');
const notificationService = require('../services/notificationService');

class VisitController {
  // Tạo lịch thăm mới
  static async createVisit(req, res) {
    try {
      const user = req.user; // từ middleware auth
      
      // Chỉ cho phép người nhà
      if (user.vai_tro !== 'nguoi_nha') {
        return res.status(403).json({
          success: false,
          message: 'Chỉ người nhà được đặt lịch thăm'
        });
      }
      
      const visitData = {
        ...req.body,
        id_nguoi_than: req.body.id_nguoi_than // hoặc tìm từ user.id
      };
      
      // Tạo lịch thăm
      const newVisit = await Visit.create(visitData);
      
      // Gửi thông báo đến điều dưỡng
      await notificationService.sendNewVisitNotification(newVisit.id);
      
      res.status(201).json({
        success: true,
        message: 'Đặt lịch thành công! Điều dưỡng sẽ xác nhận sớm.',
      });
      
    } catch (error) {
      console.error('Error creating visit:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống'
      });
    }
  }
  
  // Cập nhật trạng thái lịch thăm
  static async updateVisitStatus(req, res) {
    try {
      const user = req.user;
      const visitId = req.params.id;
      const { status, reason } = req.body;
      
      // Chỉ cho phép điều dưỡng
      if (!['dieu_duong', 'dieu_duong_truong'].includes(user.vai_tro)) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ điều dưỡng được duyệt lịch thăm'
        });
      }
      
      // Cập nhật trạng thái
      await Visit.updateStatus(visitId, status, reason);
      
      // Gửi thông báo đến người nhà
      await notificationService.sendVisitStatusNotification(visitId, status, reason);
      
      res.json({
        success: true,
        message: `Đã ${status === 'da_duyet' ? 'duyệt' : 'từ chối'} lịch thăm`
      });
      
    } catch (error) {
      console.error('Error updating visit status:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống'
      });
    }
  }
  
  // Lấy danh sách lịch thăm
  static async getVisits(req, res) {
    try {
      const user = req.user;
      let visits;
      
      if (user.vai_tro === 'nguoi_nha') {
        // Lấy theo người nhà
        const familyMemberId = await this.getFamilyMemberId(user.id);
        visits = await Visit.getByFamilyMember(familyMemberId);
      } else if (['dieu_duong', 'dieu_duong_truong'].includes(user.vai_tro)) {
        // Lấy theo điều dưỡng
        visits = await Visit.getPendingForNurse(user.id);
      } else {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }
      
      res.json({
        success: true,
        data: visits
      });
      
    } catch (error) {
      console.error('Error getting visits:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống'
      });
    }
  }
  
  // Helper: Lấy id_nguoi_than từ id_tai_khoan
  static async getFamilyMemberId(userId) {
    const db = require('../config/database');
    
    try {
      const [result] = await db.query(
        'SELECT id FROM nguoi_than_benh_nhan WHERE id_tai_khoan = ? LIMIT 1',
        [userId]
      );
      
      return result[0]?.id || null;
    } catch (error) {
      console.error('Error getting family member id:', error);
      return null;
    }
  }
}

module.exports = VisitController;