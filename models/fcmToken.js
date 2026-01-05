// models/FCMToken.js
const db = require('../config/database');

class FCMToken {
  // Lưu token
  static async saveToken(userId, token, deviceType = 'android', appType) {
    try {
      // Kiểm tra token đã tồn tại chưa
      const [existing] = await db.query(
        'SELECT id FROM fcm_tokens WHERE tai_khoan_id = ? AND token = ?',
        [userId, token]
      );
      
      if (existing.length > 0) {
        // Update existing token
        await db.query(
          'UPDATE fcm_tokens SET updated_at = NOW(), is_active = 1 WHERE id = ?',
          [existing[0].id]
        );
        return { success: true, action: 'updated' };
      } else {
        // Insert new token
        await db.query(
          `INSERT INTO fcm_tokens 
          (tai_khoan_id, token, device_type, app_type) 
          VALUES (?, ?, ?, ?)`,
          [userId, token, deviceType, appType]
        );
        return { success: true, action: 'created' };
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }
  
  // Lấy tokens của user
  static async getUserTokens(userId, userRole = null) {
    try {
      let query = `
        SELECT token, device_type, app_type 
        FROM fcm_tokens 
        WHERE tai_khoan_id = ? AND is_active = 1
      `;
      
      const params = [userId];
      
      if (userRole) {
        // Join với bảng tai_khoan để check role
        query = `
          SELECT ft.token, ft.device_type, ft.app_type 
          FROM fcm_tokens ft
          JOIN tai_khoan tk ON ft.tai_khoan_id = tk.id
          WHERE ft.tai_khoan_id = ? AND ft.is_active = 1 AND tk.vai_tro = ?
        `;
        params.push(userRole);
      }
      
      const [tokens] = await db.query(query, params);
      return tokens;
    } catch (error) {
      console.error('Error getting user tokens:', error);
      throw error;
    }
  }
  
  // Lấy tokens của điều dưỡng quản lý bệnh nhân
  static async getNurseTokensForPatient(patientId) {
    try {
      const [nurses] = await db.query(`
        SELECT DISTINCT tk.id AS nurse_id
        FROM dieu_duong_benh_nhan ddbn
        JOIN ho_so_nhan_vien hsnv ON ddbn.id_dieu_duong = hsnv.id
        JOIN tai_khoan tk ON hsnv.id_tai_khoan = tk.id
        WHERE ddbn.id_benh_nhan = ? 
          AND ddbn.trang_thai = 'dang_quan_ly'
          AND tk.vai_tro IN ('dieu_duong', 'dieu_duong_truong')
          AND tk.trang_thai = 'active'
      `, [patientId]);
      
      if (nurses.length === 0) return [];
      
      // Lấy tokens của tất cả điều dưỡng
      const nurseIds = nurses.map(n => n.nurse_id);
      const placeholders = nurseIds.map(() => '?').join(',');
      
      const [tokens] = await db.query(`
        SELECT token FROM fcm_tokens 
        WHERE tai_khoan_id IN (${placeholders}) AND is_active = 1
      `, nurseIds);
      
      return tokens.map(t => t.token);
    } catch (error) {
      console.error('Error getting nurse tokens:', error);
      return [];
    }
  }
  
  // Vô hiệu hóa token (khi logout)
  static async deactivateToken(userId, token) {
    try {
      await db.query(
        'UPDATE fcm_tokens SET is_active = 0 WHERE tai_khoan_id = ? AND token = ?',
        [userId, token]
      );
      return { success: true };
    } catch (error) {
      console.error('Error deactivating token:', error);
      throw error;
    }
  }
}

module.exports = FCMToken;