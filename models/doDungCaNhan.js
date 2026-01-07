const connection = require('../config/database');

class DoDungCaNhanModel {
    static async getDsByBenhNhan(idBenhNhan) {
        try {
            const query = `
            SELECT 
                dd.id,
                dd.id_phan_loai,
                pl.ten_loai,
                pl.mo_ta,
                dd.nguon_cung_cap,
                dd.id_benh_nhan,
                dd.ten_vat_dung,
                dd.so_luong,
                dd.tinh_trang,
                dd.media,
                dd.ghi_chu,
                dd.ngay_them,
                dd.ngay_tao,
                dd.ngay_cap_nhat
            FROM do_dung_ca_nhan dd
            LEFT JOIN phan_loai_do_dung pl ON dd.id_phan_loai = pl.id
            WHERE dd.id_benh_nhan = ?
            ORDER BY dd.ngay_them DESC, dd.ten_vat_dung ASC
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
            (id_phan_loai, nguon_cung_cap, id_benh_nhan, ten_vat_dung, 
             so_luong, tinh_trang, media, ghi_chu, ngay_them)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                data.id_phan_loai || null,
                data.nguon_cung_cap || 'ca_nhan',
                data.id_benh_nhan,
                data.ten_vat_dung,
                data.so_luong || 1,
                data.tinh_trang || 'tot',
                data.media || null,
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
            SET id_phan_loai = ?,
                nguon_cung_cap = ?,
                ten_vat_dung = ?,
                so_luong = ?,
                tinh_trang = ?,
                media = ?,
                ghi_chu = ?,
                ngay_cap_nhat = NOW()
            WHERE id = ?
            `;
            
            const values = [
                data.id_phan_loai || null,
                data.nguon_cung_cap || 'ca_nhan',
                data.ten_vat_dung,
                data.so_luong,
                data.tinh_trang,
                data.media || null,
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
            SELECT 
                dd.*,
                pl.ten_loai,
                pl.mo_ta
            FROM do_dung_ca_nhan dd
            LEFT JOIN phan_loai_do_dung pl ON dd.id_phan_loai = pl.id
            WHERE dd.id_benh_nhan = ? 
            AND dd.ten_vat_dung LIKE ?
            ORDER BY dd.ten_vat_dung ASC
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
                dd.tinh_trang,
                pl.ten_loai,
                COUNT(*) as so_luong,
                SUM(dd.so_luong) as tong_vat_dung
            FROM do_dung_ca_nhan dd
            LEFT JOIN phan_loai_do_dung pl ON dd.id_phan_loai = pl.id
            WHERE dd.id_benh_nhan = ?
            GROUP BY dd.tinh_trang, pl.ten_loai
            ORDER BY pl.ten_loai, dd.tinh_trang
            `;
            
            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows;
            
        } catch (error) {
            console.error('Lỗi khi thống kê đồ dùng:', error);
            throw error;
        }
    }

    static async getChiTietDoDung(id) {
        try {
            const query = `
            SELECT 
                dd.*,
                pl.ten_loai,
                pl.mo_ta
            FROM do_dung_ca_nhan dd
            LEFT JOIN phan_loai_do_dung pl ON dd.id_phan_loai = pl.id
            WHERE dd.id = ?
            `;
            
            const [rows] = await connection.execute(query, [id]);
            return rows[0] || null;
            
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết đồ dùng:', error);
            throw error;
        }
    }

    static async thongKeTheoPhanLoai(idBenhNhan) {
        try {
            const query = `
            SELECT 
                pl.ten_loai,
                pl.mo_ta,
                COUNT(dd.id) as so_vat_dung,
                SUM(dd.so_luong) as tong_so_luong,
                AVG(CASE WHEN dd.tinh_trang = 'tot' THEN 1 ELSE 0 END) * 100 as ty_le_tot
            FROM do_dung_ca_nhan dd
            LEFT JOIN phan_loai_do_dung pl ON dd.id_phan_loai = pl.id
            WHERE dd.id_benh_nhan = ?
            GROUP BY pl.id, pl.ten_loai, pl.mo_ta
            ORDER BY so_vat_dung DESC
            `;
            
            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows;
            
        } catch (error) {
            console.error('Lỗi khi thống kê theo phân loại:', error);
            throw error;
        }
    }
}

module.exports = DoDungCaNhanModel;