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
                SELECT 
                    bn.id,
                    bn.ho_ten,
                    bn.ngay_sinh,
                    bn.gioi_tinh,
                    bn.phong,
                    bn.tinh_trang_hien_tai,
                    bn.kha_nang_sinh_hoat
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
                total:total,
                page:page,
                limit:limit,
                totalPages:totalPages
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
                DATE(bn.ngay_sinh) as ngay_sinh,
                DATE(bn.ngay_nhap_vien) as ngay_nhap_vien,
                hs.tien_su_benh,
                hs.di_ung_thuoc,
                hs.lich_su_phau_thuat,
                nt.ho_ten as nguoi_than_ho_ten,
                nt.moi_quan_he as moi_quan_he,
                nt.so_dien_thoai as sdt_nguoi_than,
                (
                    SELECT GROUP_CONCAT(DISTINCT dv.ten_dich_vu SEPARATOR ', ')
                    FROM benh_nhan_dich_vu bndv
                    LEFT JOIN dich_vu dv ON dv.id = bndv.id_dich_vu
                    WHERE bndv.id_benh_nhan = bn.id
                        AND bndv.trang_thai = 'dang_su_dung'
                        AND dv.da_xoa = 0
                ) as ten_dich_vu
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
static async getDsBenhNhanByNguoiNha(idNguoiThan, page = 1, limit = 10, search = '') {
    try {
        if (!idNguoiThan) {
            throw new Error('Thiếu tham số idNguoiThan');
        }

        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                bn.id,
                bn.ho_ten,
                bn.ngay_sinh,
                bn.gioi_tinh,
                bn.cccd,
                bn.dia_chi,
                bn.nhom_mau,
                bn.bhyt,
                bn.phong,
                bn.anh_dai_dien,
                bn.ngay_nhap_vien,
                bn.tinh_trang_hien_tai,
                bn.kha_nang_sinh_hoat,
                bn.ngay_tao,
                bn.ngay_cap_nhat,
                DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(bn.ngay_sinh, '%Y') AS tuoi,
                ntbn.moi_quan_he,
                ntbn.so_dien_thoai as sdt_nguoi_than,
                ntbn.email as email_nguoi_than
            FROM nguoi_than_benh_nhan ntbn
            INNER JOIN benh_nhan bn ON ntbn.id_benh_nhan = bn.id
            WHERE ntbn.id = ? AND bn.da_xoa = 0
        `;

        let countQuery = `
            SELECT COUNT(*) as total
            FROM nguoi_than_benh_nhan ntbn
            INNER JOIN benh_nhan bn ON ntbn.id_benh_nhan = bn.id
            WHERE ntbn.id = ? AND bn.da_xoa = 0
        `;

        const queryParams = [idNguoiThan];
        const countParams = [idNguoiThan];

        if (search && search.trim() !== '') {
            const searchCondition = `
                AND (
                    bn.ho_ten LIKE ? OR 
                    bn.cccd LIKE ? OR 
                    bn.bhyt LIKE ? OR
                    bn.dia_chi LIKE ?
                )
            `;
            
            query += searchCondition;
            countQuery += searchCondition;
            
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam, searchParam);
        }

        // Thêm phân trang (luôn thêm vào cuối)
        query += `
            ORDER BY bn.ngay_tao DESC
            LIMIT ${limit} OFFSET ${offset}
            `;

        // Thực thi queries
        const [rows] = await connection.execute(query, [idNguoiThan]);
        const [countRows] = await connection.execute(countQuery, countParams);
        
        const total = countRows[0]?.total || 0;

        return {
            success: true,
            data: rows,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit)
        };

    } catch (error) {
        console.error('Lỗi model getDsBenhNhanByNguoiNha:', error);
        throw error;
    }
}
}
module.exports = BenhNhan