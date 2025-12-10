const connection= require('../config/database');

class BenhNhan{
    static async getTongSoBenhNhan(idDieuDuong) {
        try {
            if (!idDieuDuong) {
                throw new Error('Thiếu tham số idDieuDuong');
            }
            
            const query = `
                SELECT COUNT(DISTINCT bn.id) as tong_so
                FROM benh_nhan bn
                INNER JOIN dieu_duong_benh_nhan ddbn ON ddbn.id_benh_nhan = bn.id 
                    AND ddbn.id_dieu_duong = ?
                    AND ddbn.trang_thai = 'dang_quan_ly'
                WHERE bn.da_xoa = 0
            `;
            
            const [rows] = await connection.query(query, [idDieuDuong]);
            return rows[0].tong_so;
        } catch (error) {
            throw error;
        }
    }

    static async getDsBenhNhan(page = 1, limit = 10, search = '', idDieuDuong) {
        try {
            // Kiểm tra bắt buộc có idDieuDuong
            if (!idDieuDuong) {
                throw new Error('Thiếu tham số idDieuDuong');
            }
            
            // Validate input
            page = Math.max(1, parseInt(page) || 1);
            limit = Math.min(Math.max(1, parseInt(limit) || 10), 100);
            search = typeof search === 'string' ? search.trim() : '';
            
            const offset = (page - 1) * limit;
            
            // 1. Build main query for data
            let query = `
                SELECT bn.*, 
                       ddbn.id_dieu_duong,
                       ddbn.ngay_bat_dau,
                       ddbn.trang_thai as trang_thai_quan_ly
                FROM benh_nhan bn
                INNER JOIN dieu_duong_benh_nhan ddbn ON ddbn.id_benh_nhan = bn.id 
                    AND ddbn.id_dieu_duong = ?
                    AND ddbn.trang_thai = 'dang_quan_ly'
                WHERE bn.da_xoa = 0
            `;
            const params = [idDieuDuong];
            
            // Tìm kiếm
            if (search) {
                query += ' AND (bn.ho_ten LIKE ? OR bn.phong LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm);
            }
            
            query += ` ORDER BY bn.ngay_nhap_vien DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            console.log('Data Query:', query);
            console.log('Data Params:', params);
            
            const [rows] = await connection.query(query, params);
            
            // 2. Build count query for pagination
            let countQuery = `
                SELECT COUNT(DISTINCT bn.id) as tong_so
                FROM benh_nhan bn
                INNER JOIN dieu_duong_benh_nhan ddbn ON ddbn.id_benh_nhan = bn.id 
                    AND ddbn.id_dieu_duong = ?
                    AND ddbn.trang_thai = 'dang_quan_ly'
                WHERE bn.da_xoa = 0
            `;
            const countParams = [idDieuDuong];
            
            // Tìm kiếm
            if (search) {
                countQuery += ' AND (bn.ho_ten LIKE ? OR bn.phong LIKE ?)';
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm, searchTerm);
            }
            
            console.log('Count Query:', countQuery);
            console.log('Count Params:', countParams);
            
            const [countRows] = await connection.query(countQuery, countParams);
            const total = countRows[0].tong_so;
            const totalPages = Math.ceil(total / limit);
            
            console.log('Result:', {
                rowsCount: rows.length,
                total: total,
                page: page,
                limit: limit,
                idDieuDuong: idDieuDuong
            });
            
            return {
                data: rows,
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    totalPages: totalPages
                }
            };
            
        } catch (error) {
            console.error('Error in getDsBenhNhan model:', error);
            throw error;
        }
    }

    static async getThongTinChiTietBenhNhan(id) {
        try {
            const [rows] = await connection.query(
                `
                SELECT
                    bn.*,
                    hs.tien_su_benh,
                    hs.di_ung_thuoc,
                    hs.lich_su_phau_thuat,
                    hs.benh_ly_hien_tai,
                    nt.ho_ten as nguoi_than_ho_ten,
                    nt.moi_quan_he as nguoi_than_moi_quan_he,
                    nt.so_dien_thoai as nguoi_than_so_dien_thoai,
                    nt.email as nguoi_than_email,
                    ddbn.id_dieu_duong,
                    ddbn.ngay_bat_dau,
                    ddbn.ngay_ket_thuc,
                    ddbn.trang_thai as trang_thai_quan_ly
                FROM benh_nhan bn
                LEFT JOIN ho_so_y_te_benh_nhan hs ON hs.id_benh_nhan = bn.id
                LEFT JOIN nguoi_than_benh_nhan nt ON nt.id_benh_nhan = bn.id 
                    AND nt.la_nguoi_lien_he_chinh = 1
                LEFT JOIN dieu_duong_benh_nhan ddbn ON ddbn.id_benh_nhan = bn.id 
                    AND ddbn.trang_thai = 'dang_quan_ly'
                WHERE bn.id = ? AND bn.da_xoa = 0
                `, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw error;
        }
    }
    static async getThongTinChiTietBenhNhan(id) {
    try {
        const [rows] = await connection.query(
            `
            SELECT
                bn.*,
                hs.tien_su_benh,
                hs.di_ung_thuoc,
                hs.lich_su_phau_thuat,
                hs.benh_ly_hien_tai,
                nt.ho_ten as nguoi_than_ho_ten,
                nt.moi_quan_he as nguoi_than_moi_quan_he,
                nt.so_dien_thoai as nguoi_than_so_dien_thoai,
                nt.email as nguoi_than_email
            FROM benh_nhan bn
            LEFT JOIN ho_so_y_te_benh_nhan hs ON hs.id_benh_nhan = bn.id
            LEFT JOIN nguoi_than_benh_nhan nt ON nt.id_benh_nhan = bn.id 
                AND nt.la_nguoi_lien_he_chinh = 1
            WHERE bn.id = ? AND bn.da_xoa = 0
            `, [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
}
}
module.exports = BenhNhan