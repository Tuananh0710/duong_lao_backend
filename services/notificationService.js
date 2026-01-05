// services/notificationService.js
const admin = require('../config/firebase-admin');
const FCMToken = require('../models/fcmToken');
const Visit = require('../models/lichThamBenh');
const Notification = require('../models/ThongBao');

class NotificationService {
  // Gửi thông báo đến nhiều tokens
  async sendToTokens(tokens, notification, data = {}) {
    try {
      if (!tokens || tokens.length === 0) {
        console.log('No tokens to send notification');
        return { success: false, sentCount: 0 };
      }
      
      // Chuẩn bị message
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        tokens: tokens,
        android: {
          priority: 'high',
          notification: {
            channelId: 'visits_channel',
            sound: 'default',
            icon: 'ic_notification',
            color: '#FF6B6B'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };
      
      // Gửi thông báo
      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`✅ Sent ${response.successCount} notifications`);
      
      return {
        success: true,
        sentCount: response.successCount,
        failedCount: response.failureCount,
        responses: response.responses
      };
      
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Gửi thông báo lịch thăm mới đến điều dưỡng
  async sendNewVisitNotification(visitId) {
    try {
      // Lấy thông tin lịch thăm
      const visit = await Visit.findById(visitId);
      
      if (!visit) {
        throw new Error('Visit not found');
      }
      
      // Lấy tokens của điều dưỡng quản lý bệnh nhân
      const tokens = await FCMToken.getNurseTokensForPatient(visit.id_benh_nhan);
      
      if (tokens.length === 0) {
        console.log('No nurse tokens found for patient');
        return { success: false, sentCount: 0 };
      }
      
      // Tạo nội dung thông báo
      const notification = {
        title: '📅 Lịch thăm mới',
        body: `${visit.ten_nguoi_than} đặt lịch thăm ${visit.ten_benh_nhan}`
      };
      
      const data = {
        type: 'NEW_VISIT',
        visitId: visitId.toString(),
        patientName: visit.ten_benh_nhan,
        patientRoom: visit.phong || '',
        familyName: visit.ten_nguoi_than,
        familyPhone: visit.sdt_nguoi_than || '',
        visitDate: visit.ngay ? new Date(visit.ngay).toISOString() : '',
        visitTime: visit.khung_gio || '',
        status: visit.trang_thai || 'cho_duyet',
        screen: 'VisitDetail',
        action: 'view_visit'
      };
      
      // Gửi thông báo FCM
      const result = await this.sendToTokens(tokens, notification, data);
      
      // Lưu thông báo vào database cho từng điều dưỡng
      if (result.success && result.sentCount > 0) {
        // Lấy danh sách điều dưỡng
        const nurses = await this.getNursesForPatient(visit.id_benh_nhan);
        
        for (const nurse of nurses) {
          await Notification.create({
            id_nguoi_nhan: nurse.id,
            loai: 'cong_viec',
            tieu_de: notification.title,
            noi_dung: notification.body,
            link: `/lich-tham/${visitId}`
          });
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('Error in sendNewVisitNotification:', error);
      throw error;
    }
  }
  
  // Gửi thông báo trạng thái đến người nhà
  async sendVisitStatusNotification(visitId, status, reason = '') {
    try {
      const visit = await Visit.findById(visitId);
      
      if (!visit || !visit.id_tai_khoan_nguoi_nha) {
        throw new Error('Visit or family member not found');
      }
      
      // Lấy tokens của người nhà
      const tokens = await FCMToken.getUserTokens(visit.id_tai_khoan_nguoi_nha, 'nguoi_nha');
      const tokenList = tokens.map(t => t.token);
      
      if (tokenList.length === 0) {
        console.log('No family member tokens found');
        return { success: false, sentCount: 0 };
      }
      
      // Tạo nội dung theo trạng thái
      let notification, data;
      
      switch (status) {
        case 'da_duyet':
          notification = {
            title: '✅ Lịch thăm được duyệt',
            body: `Lịch thăm ${visit.ten_benh_nhan} đã được duyệt`
          };
          data = {
            type: 'VISIT_APPROVED',
            visitId: visitId.toString(),
            patientName: visit.ten_benh_nhan,
            visitDate: visit.ngay ? new Date(visit.ngay).toISOString() : '',
            visitTime: visit.khung_gio || '',
            status: 'da_duyet',
            screen: 'MyVisits',
            action: 'view_visit'
          };
          break;
          
        case 'tu_choi':
          notification = {
            title: '❌ Lịch thăm bị từ chối',
            body: `Lịch thăm ${visit.ten_benh_nhan} bị từ chối${reason ? ': ' + reason : ''}`
          };
          data = {
            type: 'VISIT_REJECTED',
            visitId: visitId.toString(),
            patientName: visit.ten_benh_nhan,
            reason: reason,
            status: 'tu_choi',
            screen: 'MyVisits',
            action: 'view_visit'
          };
          break;
          
        default:
          throw new Error('Invalid status');
      }
      
      // Gửi thông báo FCM
      const result = await this.sendToTokens(tokenList, notification, data);
      
      // Lưu thông báo vào database
      if (result.success) {
        await Notification.create({
          id_nguoi_nhan: visit.id_tai_khoan_nguoi_nha,
          loai: 'cong_viec',
          tieu_de: notification.title,
          noi_dung: notification.body,
          link: `/lich-tham/${visitId}`
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('Error in sendVisitStatusNotification:', error);
      throw error;
    }
  }
  
  // Helper: Lấy danh sách điều dưỡng quản lý bệnh nhân
  async getNursesForPatient(patientId) {
    const db = require('../config/database');
    
    try {
      const [nurses] = await db.query(`
        SELECT tk.id, tk.ho_ten
        FROM dieu_duong_benh_nhan ddbn
        JOIN ho_so_nhan_vien hsnv ON ddbn.id_dieu_duong = hsnv.id
        JOIN tai_khoan tk ON hsnv.id_tai_khoan = tk.id
        WHERE ddbn.id_benh_nhan = ? 
          AND ddbn.trang_thai = 'dang_quan_ly'
          AND tk.vai_tro IN ('dieu_duong', 'dieu_duong_truong')
      `, [patientId]);
      
      return nurses;
    } catch (error) {
      console.error('Error getting nurses for patient:', error);
      return [];
    }
  }
}

module.exports = new NotificationService();