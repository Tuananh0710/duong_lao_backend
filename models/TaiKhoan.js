const db = require('../config/database');

class TaiKhoan {

  // Tìm tài khoản bằng email
  static async findByEmail(email) {
    const query = 'SELECT * FROM tai_khoan WHERE email = ? AND da_xoa = 0';
    const [rows] = await db.execute(query, [email]);
    return rows[0];
  }

  // Tìm tài khoản bằng số điện thoại
  static async findByPhone(so_dien_thoai) {
    const query = 'SELECT * FROM tai_khoan WHERE so_dien_thoai = ? AND da_xoa = 0';
    const [rows] = await db.execute(query, [so_dien_thoai]);
    return rows[0];
  }

  // Tìm tài khoản bằng ID
  static async findById(id) {
    const query = 'SELECT id, ho_ten, so_dien_thoai, email, avatar, vai_tro, trang_thai FROM tai_khoan WHERE id = ? AND da_xoa = 0';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  // Cập nhật thông tin tài khoản
  static async update(id, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const query = `UPDATE tai_khoan SET ${fields.join(', ')}, ngay_cap_nhat = CURRENT_TIMESTAMP WHERE id = ?`;
    const [result] = await db.execute(query, values);
    return result;
  }

  // Lấy danh sách tài khoản
  static async getAll(limit = 10, offset = 0) {
    const query = `
      SELECT id, ho_ten, so_dien_thoai, email, avatar, vai_tro, trang_thai, ngay_tao 
      FROM tai_khoan 
      WHERE da_xoa = 0 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.execute(query, [limit, offset]);
    return rows;
  }

  // Đếm tổng số tài khoản
  static async count() {
    const query = 'SELECT COUNT(*) as total FROM tai_khoan WHERE da_xoa = 0';
    const [rows] = await db.execute(query);
    return rows[0].total;
  }
}

module.exports = TaiKhoan;