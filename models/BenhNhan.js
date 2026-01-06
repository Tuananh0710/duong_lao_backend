const connection = require('../config/database');

class BenhNhan {
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
            if (!idDieuDuong) {
                throw new Error('Thiếu tham số idDieuDuong');
            }
            
            page = Math.max(1, parseInt(page) || 1);
            limit = Math.min(Math.max(1, parseInt(limit) || 10), 100);
            search = typeof search === 'string' ? search.trim() : '';
            
            const offset = (page - 1) * limit;
            
            // Query tối ưu: Lấy tất cả thông tin + tính trạng thái trong 1 query
            let query = `
                SELECT 
                    bn.id,
                    bn.ho_ten,
                    bn.ngay_sinh,
                    bn.gioi_tinh,
                    CONCAT(pk.ten_khu, '-', p.so_phong) as phong,
                    bn.kha_nang_sinh_hoat,
                    COALESCE(
                        (
                            SELECT 
                                CASE 
                                    -- Mức 3: Nguy hiểm (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Nguy hiểm'
                                    
                                    -- Mức 2: Cần theo dõi (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Cần theo dõi'
                                    
                                    -- Mức 1: Bình thường (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Bình thường'
                                    
                                    -- Nếu không có chỉ số trong 24h, kiểm tra chỉ số cũ hơn
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) THEN 'Nguy hiểm '
                                    
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) THEN 'Cần theo dõi '
                                    
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) THEN 'Bình thường '
                                    
                                    -- Mặc định: Chưa có dữ liệu
                                    ELSE 'Chưa có dữ liệu'
                                END
                        ),
                        'Chưa có dữ liệu'
                    ) as tinh_trang_hien_tai
                FROM benh_nhan bn
                INNER JOIN dieu_duong_benh_nhan ddbn ON ddbn.id_benh_nhan = bn.id 
                    AND ddbn.id_dieu_duong = ?
                    AND ddbn.trang_thai = 'dang_quan_ly'
                LEFT JOIN phong_o_benh_nhan pobn ON pobn.id_benh_nhan = bn.id 
                    AND (pobn.ngay_ket_thuc_o IS NULL OR pobn.ngay_ket_thuc_o > CURDATE())
                LEFT JOIN phong p ON p.id = pobn.id_phong AND p.da_xoa = 0
                LEFT JOIN phan_khu pk ON pk.id = p.id_phan_khu AND pk.da_xoa = 0
                WHERE bn.da_xoa = 0
            `;
            const params = [idDieuDuong];
            
            if (search) {
                query += ' AND (bn.ho_ten LIKE ? OR CONCAT(pk.ten_khu, \'-\', p.so_phong) LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm);
            }
            
            // Sắp xếp theo mức độ nguy hiểm trước (ưu tiên dữ liệu mới)
            query += ` 
                ORDER BY 
                    CASE 
                        WHEN tinh_trang_hien_tai LIKE 'Nguy hiểm%' THEN 
                            CASE WHEN tinh_trang_hien_tai LIKE '%' THEN 2 ELSE 1 END
                        WHEN tinh_trang_hien_tai LIKE 'Cần theo dõi%' THEN 
                            CASE WHEN tinh_trang_hien_tai LIKE '%' THEN 4 ELSE 3 END
                        WHEN tinh_trang_hien_tai LIKE 'Bình thường%' THEN 
                            CASE WHEN tinh_trang_hien_tai LIKE '%' THEN 6 ELSE 5 END
                        ELSE 7
                    END,
                    bn.ngay_nhap_vien DESC 
                LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
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
            
            if (search) {
                countQuery += ' AND bn.ho_ten LIKE ?';
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm);
            }
            
            const [countRows] = await connection.query(countQuery, countParams);
            const total = countRows[0].tong_so;
            const totalPages = Math.ceil(total / limit);
            
            return {
                data: rows,
                total: total,
                page: page,
                limit: limit,
                totalPages: totalPages
            };
            
        } catch (error) {
            console.error('Error in getDsBenhNhan model:', error);
            throw error;
        }
    }

    static async getThongTinChiTietBenhNhan(id) {
        try {
            // Query tối ưu: Lấy tất cả thông tin + tính trạng thái trong 1 query
            const [rows] = await connection.query(
                `
                SELECT
                    bn.id,
                    bn.ho_ten,
                    bn.ngay_sinh,
                    bn.gioi_tinh,
                    bn.cccd,
                    bn.dia_chi,
                    bn.nhom_mau,
                    bn.bhyt,
                    CONCAT(pk.ten_khu, '-', p.so_phong) as phong,
                    bn.anh_dai_dien,
                    bn.ngay_nhap_vien,
                    bn.kha_nang_sinh_hoat,
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
                    ) as ten_dich_vu,
                    COALESCE(
                        (
                            SELECT 
                                CASE 
                                    -- Mức 3: Nguy hiểm (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Nguy hiểm'
                                    
                                    -- Mức 2: Cần theo dõi (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Cần theo dõi'
                                    
                                    -- Mức 1: Bình thường (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Bình thường'
                                    
                                    -- Nếu không có chỉ số trong 24h, kiểm tra chỉ số cũ hơn
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) THEN 'Nguy hiểm '
                                    
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) THEN 'Cần theo dõi '
                                    
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) THEN 'Bình thường '
                                    
                                    -- Mặc định: Chưa có dữ liệu
                                    ELSE 'Chưa có dữ liệu'
                                END
                        ),
                        'Chưa có dữ liệu'
                    ) as tinh_trang_hien_tai
                FROM benh_nhan bn
                LEFT JOIN ho_so_y_te_benh_nhan hs ON hs.id_benh_nhan = bn.id
                LEFT JOIN nguoi_than_benh_nhan nt ON nt.id_benh_nhan = bn.id 
                    AND nt.la_nguoi_lien_he_chinh = 1
                LEFT JOIN phong_o_benh_nhan pobn ON pobn.id_benh_nhan = bn.id 
                    AND (pobn.ngay_ket_thuc_o IS NULL OR pobn.ngay_ket_thuc_o > CURDATE())
                LEFT JOIN phong p ON p.id = pobn.id_phong AND p.da_xoa = 0
                LEFT JOIN phan_khu pk ON pk.id = p.id_phan_khu AND pk.da_xoa = 0
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
            
            // Query tối ưu: Lấy tất cả thông tin + tính trạng thái trong 1 query
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
                    CONCAT(pk.ten_khu, '-', p.so_phong) as phong,
                    bn.anh_dai_dien,
                    bn.ngay_nhap_vien,
                    bn.kha_nang_sinh_hoat,
                    bn.ngay_tao,
                    bn.ngay_cap_nhat,
                    DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(bn.ngay_sinh, '%Y') AS tuoi,
                    ntbn.moi_quan_he,
                    ntbn.so_dien_thoai as sdt_nguoi_than,
                    ntbn.email as email_nguoi_than,
                    COALESCE(
                        (
                            SELECT 
                                CASE 
                                    -- Mức 3: Nguy hiểm (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Nguy hiểm'
                                    
                                    -- Mức 2: Cần theo dõi (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Cần theo dõi'
                                    
                                    -- Mức 1: Bình thường (trong 24h)
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        AND thoi_gian_do >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                                        LIMIT 1
                                    ) THEN 'Bình thường'
                                    
                                    -- Nếu không có chỉ số trong 24h, kiểm tra chỉ số cũ hơn
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'nguy_hiem'
                                        LIMIT 1
                                    ) THEN 'Nguy hiểm '
                                    
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'canh_bao'
                                        LIMIT 1
                                    ) THEN 'Cần theo dõi '
                                    
                                    WHEN EXISTS (
                                        SELECT 1 FROM huyet_ap 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhip_tim 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM nhiet_do 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) OR EXISTS (
                                        SELECT 1 FROM duong_huyet 
                                        WHERE id_benh_nhan = bn.id 
                                        AND muc_do = 'binh_thuong'
                                        LIMIT 1
                                    ) THEN 'Bình thường '
                                    
                                    -- Mặc định: Chưa có dữ liệu
                                    ELSE 'Chưa có dữ liệu'
                                END
                        ),
                        'Chưa có dữ liệu'
                    ) as tinh_trang_hien_tai
                FROM nguoi_than_benh_nhan ntbn
                INNER JOIN benh_nhan bn ON ntbn.id_benh_nhan = bn.id
                LEFT JOIN phong_o_benh_nhan pobn ON pobn.id_benh_nhan = bn.id 
                    AND (pobn.ngay_ket_thuc_o IS NULL OR pobn.ngay_ket_thuc_o > CURDATE())
                LEFT JOIN phong p ON p.id = pobn.id_phong AND p.da_xoa = 0
                LEFT JOIN phan_khu pk ON pk.id = p.id_phan_khu AND pk.da_xoa = 0
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

            query += `
                ORDER BY 
                    CASE 
                        WHEN tinh_trang_hien_tai LIKE 'Nguy hiểm%' THEN 
                            CASE WHEN tinh_trang_hien_tai LIKE '%' THEN 2 ELSE 1 END
                        WHEN tinh_trang_hien_tai LIKE 'Cần theo dõi%' THEN 
                            CASE WHEN tinh_trang_hien_tai LIKE '%' THEN 4 ELSE 3 END
                        WHEN tinh_trang_hien_tai LIKE 'Bình thường%' THEN 
                            CASE WHEN tinh_trang_hien_tai LIKE '%(dữ liệu cũ)' THEN 6 ELSE 5 END
                        ELSE 7
                    END,
                    bn.ngay_tao DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const [rows] = await connection.execute(query, queryParams);
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

module.exports = BenhNhan;