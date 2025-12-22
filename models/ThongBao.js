const connection = require('../config/database');

class ThongBao{
    static async getByType(type,limit=20,offset=0){
        try {
            const query=`
            SELECT id, id_nguoi_nhan, tieu_de, noi_dung, link, ngay_tao, ngay_cap_nhat 
            FROM thong_bao 
            WHERE loai = ?
            ORDER BY ngay_tao DESC LIMIT ? OFFSET ?
            `;
            const [rows]= await connection.execute(query,[type,parseInt(limit),parseInt(offset)]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getById(id){
        try{
            const query=`
            SELECT * FROM thong_bao WHERE id = ? 
            `;
            const [rows]= await connection.execute(query,[id]);
            return rows[0] || null;
        }
        catch (error) {
            throw error;
        }
    }

    static async countByType(loai){
        try {
            const [rows]= await connection.execute(`SELECT COUNT(*) as tong_so FROM thong_bao where loai = ?`,[loai]);
            return rows[0].tong_so;
        } catch (error) {
            throw error;
        }
    }
    static async create(notificationData) {
    try {
      const {
        id_nguoi_nhan,
        loai = 'cong_viec',
        tieu_de,
        noi_dung,
        link = null,
        da_doc = 0
      } = notificationData;
      
      const [result] = await db.query(
        `INSERT INTO thong_bao 
        (id_nguoi_nhan, loai, tieu_de, noi_dung, link, da_doc) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [id_nguoi_nhan, loai, tieu_de, noi_dung, link, da_doc]
      );
      
      return { id: result.insertId };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Đánh dấu đã đọc
  static async markAsRead(notificationId, userId) {
    try {
      await db.query(
        'UPDATE thong_bao SET da_doc = 1 WHERE id = ? AND id_nguoi_nhan = ?',
        [notificationId, userId]
      );
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  // Lấy thông báo của user
  static async getByUser(userId, limit = 20) {
    try {
      const [notifications] = await db.query(`
        SELECT * FROM thong_bao 
        WHERE id_nguoi_nhan = ? 
        ORDER BY ngay_tao DESC 
        LIMIT ?
      `, [userId, limit]);
      
      return notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }
}
module.exports = ThongBao;