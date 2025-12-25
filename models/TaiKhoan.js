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

  static async getThongTinTaiKhoanByNguoiThan(id_tai_khoan){
    try {
      const query=
      `
       SELECT tk.ho_ten, tk.so_dien_thoai, tk.id, tk.email, tk.avatar, tk.vai_tro, tk.trang_thai, tk.ngay_tao, tk.ngay_xoa, tk.ngay_cap_nhat FROM tai_khoan tk WHERE tk.id= ?
      `
      const [rows]= await db.execute(query,[id_tai_khoan]);
      return rows[0] || null
    } catch (error) {
      console.error('lỗi khi lấy thông tin tk:', error);
      throw error;
    }
  }
  // TaiKhoan.js - Thêm hàm updateTaiKhoan
static async updateTaiKhoan(id, updateData) {
    try {
        // Danh sách các trường được phép cập nhật
        const allowedFields = [
            'ho_ten', 
            'so_dien_thoai', 
            'email', 
            'avatar', 
        ];
        
        const fields = [];
        const values = [];
        const validUpdates = {};

        // Kiểm tra và lọc dữ liệu hợp lệ
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key) && updateData[key] !== undefined && updateData[key] !== null) {
                // Kiểm tra email có đúng định dạng không
                if (key === 'email' && updateData[key]) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(updateData[key])) {
                        throw new Error('Email không hợp lệ');
                    }
                }
                
                // Kiểm tra số điện thoại
                if (key === 'so_dien_thoai' && updateData[key]) {
                    const phoneRegex = /^[0-9]{10,15}$/;
                    if (!phoneRegex.test(updateData[key])) {
                        throw new Error('Số điện thoại không hợp lệ');
                    }
                }
                
                
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
                validUpdates[key] = updateData[key];
            }
        });

        // Kiểm tra nếu không có trường nào để cập nhật
        if (fields.length === 0) {
            throw new Error('Không có dữ liệu hợp lệ để cập nhật');
        }

        // Kiểm tra ID hợp lệ
        if (!id || isNaN(parseInt(id))) {
            throw new Error('ID tài khoản không hợp lệ');
        }

        // Kiểm tra email trùng lặp (nếu có cập nhật email)
        if (validUpdates.email) {
            const existingEmail = await this.findByEmail(validUpdates.email);
            if (existingEmail && existingEmail.id !== parseInt(id)) {
                throw new Error('Email đã được sử dụng bởi tài khoản khác');
            }
        }

        // Kiểm tra số điện thoại trùng lặp (nếu có cập nhật số điện thoại)
        if (validUpdates.so_dien_thoai) {
            const existingPhone = await this.findByPhone(validUpdates.so_dien_thoai);
            if (existingPhone && existingPhone.id !== parseInt(id)) {
                throw new Error('Số điện thoại đã được sử dụng bởi tài khoản khác');
            }
        }

        // Thêm ID vào cuối mảng values
        values.push(id);

        // Tạo câu query UPDATE
        const query = `
            UPDATE tai_khoan 
            SET ${fields.join(', ')}, 
                ngay_cap_nhat = CURRENT_TIMESTAMP 
            WHERE id = ? AND da_xoa = 0
        `;

        // Thực thi query
        const [result] = await db.execute(query, values);

        // Kiểm tra xem có bản ghi nào được cập nhật không
        if (result.affectedRows === 0) {
            throw new Error('Không tìm thấy tài khoản hoặc tài khoản đã bị xóa');
        }

        // Lấy thông tin tài khoản sau khi cập nhật
        const updatedAccount = await this.findById(id);
        
        return {
            success: true,
            message: 'Cập nhật tài khoản thành công',
            data: updatedAccount,
            affectedRows: result.affectedRows
        };

    } catch (error) {
        console.error('Lỗi khi cập nhật tài khoản:', error);
        
        // Xử lý lỗi MySQL
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('email')) {
                throw new Error('Email đã được sử dụng');
            } else if (error.message.includes('so_dien_thoai')) {
                throw new Error('Số điện thoại đã được sử dụng');
            }
        }
        
        throw error;
    }
}
}

module.exports = TaiKhoan;