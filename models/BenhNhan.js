const connection = require('../config/database');
const MucDoHelper = require('../helpers/mucDoHelper'); // Import helper mới

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
        
        // Query chính - không còn chứa logic mức độ phức tạp
        let query = `
            SELECT 
                bn.id,
                bn.ho_ten,
                bn.ngay_sinh,
                bn.gioi_tinh,
                -- Tính tuổi từ ngày sinh
                DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(bn.ngay_sinh, '%Y') AS tuoi,
                CONCAT(pk.ten_khu, '-', p.so_phong) as phong,
                bn.kha_nang_sinh_hoat,
                bn.ngay_nhap_vien
            FROM benh_nhan bn
            INNER JOIN dieu_duong_benh_nhan ddbn ON ddbn.id_benh_nhan = bn.id 
                AND ddbn.id_dieu_duong = ?
                AND ddbn.trang_thai = 'dang_quan_ly'
            LEFT JOIN phong_o_benh_nhan pobn ON pobn.id_benh_nhan = bn.id 
                AND (pobn.ngay_ket_thuc_o IS NULL OR pobn.ngay_ket_thuc_o > CURDATE())
            LEFT JOIN phong p ON p.id = pobn.id_phong AND p.da_xoa = 0
            LEFT JOIN phan_khu pk ON pk.id = p.id_phan_khu AND pk.da_xoa = 0
            WHERE bn.da_xoa = 0 AND bn.tinh_trang_hien_tai !='Đã xuất viện'
        `;
        
        const params = [idDieuDuong];
        
        if (search) {
            query += ' AND (bn.ho_ten LIKE ? OR CONCAT(pk.ten_khu, \'-\', p.so_phong) LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }
        
        // Lấy dữ liệu cơ bản
        query += ` 
            ORDER BY bn.ngay_nhap_vien DESC 
            LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const [rows] = await connection.query(query, params);
        
        // Thêm mức độ cảnh báo cho từng bệnh nhân
        const rowsWithTinhTrang = await Promise.all(
            rows.map(async (row, index) => {
                const tinhTrang = await MucDoHelper.getMucDoCaoNhat(row.id);
                return {
                    ...row,
                    tinh_trang_hien_tai: tinhTrang
                };
            })
        );
        
        // Sắp xếp lại theo mức độ cảnh báo
        rowsWithTinhTrang.sort((a, b) => {
            const priority = {
                'Nguy hiểm': 1,
                'Cảnh báo': 2,
                'Bình thường': 3,
                'Bình thường': 4,
                'Chưa có dữ liệu': 5
            };
            
            const priA = priority[a.tinh_trang_hien_tai] || 6;
            const priB = priority[b.tinh_trang_hien_tai] || 6;
            
            return priA - priB || new Date(b.ngay_nhap_vien) - new Date(a.ngay_nhap_vien);
        });
        
        // Đếm tổng số bệnh nhân
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
            data: rowsWithTinhTrang,
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
            // Sửa phần query người thân: lấy người thân chính, nếu không có thì lấy người thân đầu tiên
            const [rows] = await connection.query(
                `
                SELECT
                    bn.id,
                    DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(bn.ngay_sinh, '%Y') AS tuoi,
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
                    -- Sửa phần người thân: lấy người thân chính, nếu không có thì lấy người thân đầu tiên
                    (
                        SELECT nt.ho_ten 
                        FROM nguoi_than_benh_nhan nt 
                        WHERE nt.id_benh_nhan = bn.id 
                        ORDER BY 
                            -- Ưu tiên người thân chính trước
                            CASE WHEN nt.la_nguoi_lien_he_chinh = 1 THEN 0 ELSE 1 END,
                            -- Sau đó sắp xếp theo ID (người thân cũ nhất)
                            nt.id ASC
                        LIMIT 1
                    ) as nguoi_than_ho_ten,
                    (
                        SELECT nt.moi_quan_he 
                        FROM nguoi_than_benh_nhan nt 
                        WHERE nt.id_benh_nhan = bn.id 
                        ORDER BY 
                            CASE WHEN nt.la_nguoi_lien_he_chinh = 1 THEN 0 ELSE 1 END,
                            nt.id ASC
                        LIMIT 1
                    ) as moi_quan_he,
                    (
                        SELECT nt.so_dien_thoai 
                        FROM nguoi_than_benh_nhan nt 
                        WHERE nt.id_benh_nhan = bn.id 
                        ORDER BY 
                            CASE WHEN nt.la_nguoi_lien_he_chinh = 1 THEN 0 ELSE 1 END,
                            nt.id ASC
                        LIMIT 1
                    ) as sdt_nguoi_than,
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
                LEFT JOIN phong_o_benh_nhan pobn ON pobn.id_benh_nhan = bn.id 
                    AND (pobn.ngay_ket_thuc_o IS NULL OR pobn.ngay_ket_thuc_o > CURDATE())
                LEFT JOIN phong p ON p.id = pobn.id_phong AND p.da_xoa = 0
                LEFT JOIN phan_khu pk ON pk.id = p.id_phan_khu AND pk.da_xoa = 0
                WHERE bn.id = ? AND bn.da_xoa = 0  AND bn.tinh_trang_hien_tai !='Đã xuất viện'
                `, [id]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const benhNhan = rows[0];
            benhNhan.tinh_trang_hien_tai = await MucDoHelper.getMucDoCaoNhat(id);
            
            return benhNhan;
            
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
            
            // Query đơn giản hơn
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
                    ntbn.email as email_nguoi_than
                FROM nguoi_than_benh_nhan ntbn
                INNER JOIN benh_nhan bn ON ntbn.id_benh_nhan = bn.id
                LEFT JOIN phong_o_benh_nhan pobn ON pobn.id_benh_nhan = bn.id 
                    AND (pobn.ngay_ket_thuc_o IS NULL OR pobn.ngay_ket_thuc_o > CURDATE())
                LEFT JOIN phong p ON p.id = pobn.id_phong AND p.da_xoa = 0
                LEFT JOIN phan_khu pk ON pk.id = p.id_phan_khu AND pk.da_xoa = 0
                WHERE ntbn.id_tai_khoan = ? AND bn.da_xoa = 0  AND bn.tinh_trang_hien_tai !='Đã xuất viện'
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
                ORDER BY bn.ngay_tao DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            const [rows] = await connection.execute(query, queryParams);
            const [countRows] = await connection.execute(countQuery, countParams);
            
            const total = countRows[0]?.total || 0;

            // Thêm tình trạng cho từng bệnh nhân
            const rowsWithTinhTrang = await Promise.all(
                rows.map(async (row) => {
                    const tinhTrang = await MucDoHelper.getMucDoCaoNhat(row.id);
                    return {
                        ...row,
                        tinh_trang_hien_tai: tinhTrang
                    };
                })
            );
            
            // Sắp xếp theo mức độ cảnh báo
            rowsWithTinhTrang.sort((a, b) => {
                const priority = {
                    'Nguy hiểm': 1,
                    'Cảnh báo': 2,
                    'Bình thường': 3,
                    'Bình thường': 4,
                    'Chưa có dữ liệu': 5
                };
                
                const priA = priority[a.tinh_trang_hien_tai] || 6;
                const priB = priority[b.tinh_trang_hien_tai] || 6;
                
                return priA - priB || new Date(b.ngay_tao) - new Date(a.ngay_tao);
            });

            return {
                success: true,
                data: rowsWithTinhTrang,
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