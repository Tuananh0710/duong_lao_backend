const connection = require('../config/database');

class DoDungCaNhanModel {
    static async getDsByBenhNhan(idBenhNhan) {
        try {
            const query = `
            SELECT 
                id,
                id_benh_nhan,
                ten_vat_dung,
                so_luong,
                tinh_trang,
                ghi_chu,
                ngay_them,
                ngay_tao,
                ngay_cap_nhat
            FROM do_dung_ca_nhan
            WHERE id_benh_nhan = ?
            ORDER BY ngay_them DESC, ten_vat_dung ASC
            `;
            
            if (!idBenhNhan) {
                throw new Error('Thiếu tham số cần thiết: idBenhNhan');
            }
            
            const [rows] = await connection.execute(query, [idBenhNhan]); 
            return rows;
            
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đồ dùng cá nhân:', error);
            throw error;
        }
    }

    static async themDoDung(data) {
        try {
            const query = `
            INSERT INTO do_dung_ca_nhan 
            (id_benh_nhan, ten_vat_dung, so_luong, tinh_trang, ghi_chu, ngay_them)
            VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                data.id_benh_nhan,
                data.ten_vat_dung,
                data.so_luong || 1,
                data.tinh_trang || 'tot',
                data.ghi_chu || null,
                data.ngay_them || new Date()
            ];
            
            const [result] = await connection.execute(query, values);
            return result.insertId; 
            
        } catch (error) {
            console.error('Lỗi khi thêm đồ dùng cá nhân:', error);
            throw error;
        }
    }

    static async capNhatDoDung(id, data) {
        try {
            const query = `
            UPDATE do_dung_ca_nhan 
            SET ten_vat_dung = ?,
                so_luong = ?,
                tinh_trang = ?,
                ghi_chu = ?,
                ngay_cap_nhat = NOW()
            WHERE id = ?
            `;
            
            const values = [
                data.ten_vat_dung,
                data.so_luong,
                data.tinh_trang,
                data.ghi_chu || null,
                id
            ];
            
            const [result] = await connection.execute(query, values);
            return result.affectedRows > 0;
            
        } catch (error) {
            console.error('Lỗi khi cập nhật đồ dùng:', error);
            throw error;
        }
    }

    static async xoaDoDung(id) {
        try {
            const query = `
            DELETE FROM do_dung_ca_nhan 
            WHERE id = ?
            `;
            
            const [result] = await connection.execute(query, [id]);
            return result.affectedRows > 0;
            
        } catch (error) {
            console.error('Lỗi khi xóa đồ dùng:', error);
            throw error;
        }
    }

    static async timKiemDoDung(idBenhNhan, tenVatDung) {
        try {
            const query = `
            SELECT *
            FROM do_dung_ca_nhan
            WHERE id_benh_nhan = ? 
            AND ten_vat_dung LIKE ?
            ORDER BY ten_vat_dung ASC
            `;
            
            const [rows] = await connection.execute(query, [
                idBenhNhan, 
                `%${tenVatDung}%`
            ]);
            return rows;
            
        } catch (error) {
            console.error('Lỗi khi tìm kiếm đồ dùng:', error);
            throw error;
        }
    }

    static async thongKeDoDung(idBenhNhan) {
        try {
            const query = `
            SELECT 
                tinh_trang,
                COUNT(*) as so_luong,
                SUM(so_luong) as tong_vat_dung
            FROM do_dung_ca_nhan
            WHERE id_benh_nhan = ?
            GROUP BY tinh_trang
            `;
            
            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows;
            
        } catch (error) {
            console.error('Lỗi khi thống kê đồ dùng:', error);
            throw error;
        }
    }
}

module.exports = DoDungCaNhanModel;