const connection = require('../config/database');

class NhanVien {
    static async layDanhSachNhanVien(idBenhNhan) {
        try {
            const query = `
                SELECT 
                    tk.ho_ten,
                    hsnv.chuyen_mon,
                    hsnv.so_nam_kinh_nghiem,
                    hsnv.avatar,
                    hsnv.id AS id_dieu_duong,
                    hsnv.chuc_vu,
                    hsnv.noi_cong_tac,
                    tk.so_dien_thoai,
                    tk.vai_tro,
                    GROUP_CONCAT(
                        DISTINCT lpc.ca
                        ORDER BY 
                            CASE lpc.ca
                                WHEN 'sang' THEN 1
                                WHEN 'chieu' THEN 2
                                WHEN 'dem' THEN 3
                                ELSE 4
                            END
                        SEPARATOR ', '
                    ) AS lich_lam_viec
                FROM dieu_duong_benh_nhan ddbn
                JOIN ho_so_nhan_vien hsnv 
                    ON ddbn.id_dieu_duong = hsnv.id
                JOIN tai_khoan tk 
                    ON hsnv.id_tai_khoan = tk.id
                LEFT JOIN lich_phan_ca lpc
                    ON lpc.id_tai_khoan = tk.id
                    AND DATE(lpc.ngay) = CURDATE()
                WHERE ddbn.id_benh_nhan = ?
                  AND ddbn.trang_thai = 'dang_quan_ly'
                GROUP BY 
                    hsnv.id,
                    tk.id,
                    hsnv.chuyen_mon,
                    hsnv.so_nam_kinh_nghiem,
                    hsnv.avatar,
                    hsnv.chuc_vu,
                    hsnv.noi_cong_tac,
                    tk.ho_ten,
                    tk.so_dien_thoai,
                    tk.vai_tro
            `;

            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows;

        } catch (error) {
            console.error('Lỗi lấy danh sách nhân viên:', error);
            throw error;
        }
    }

    static async layChiTietNhanVien(idDieuDuong) {
        try {
            const query = `
                SELECT 
                    MAX(ddbn.trang_thai) AS trang_thai,
                    hsnv.id AS id_dieu_duong,
                    hsnv.chuc_vu,
                    hsnv.chuyen_mon,
                    hsnv.so_nam_kinh_nghiem,
                    hsnv.avatar,
                    hsnv.gioi_thieu,
                    hsnv.noi_cong_tac,
                    hsnv.lich_lam_viec,
                    COALESCE(hsnv.danh_gia, 0) AS so_sao,
                    tk.ho_ten,
                    tk.so_dien_thoai,
                    tk.vai_tro,
                    tk.trang_thai,
                    COUNT(DISTINCT ddbn2.id_benh_nhan) AS so_benh_nhan_da_dieu_tri,
                    GROUP_CONCAT(
                        DISTINCT lpc.ca
                        ORDER BY 
                            CASE lpc.ca
                                WHEN 'sang' THEN 1
                                WHEN 'chieu' THEN 2
                                WHEN 'dem' THEN 3
                                ELSE 4
                            END
                        SEPARATOR ', '
                    ) AS ca_lam_viec
                FROM ho_so_nhan_vien hsnv
                JOIN tai_khoan tk 
                    ON hsnv.id_tai_khoan = tk.id
                LEFT JOIN dieu_duong_benh_nhan ddbn
                    ON ddbn.id_dieu_duong = hsnv.id
                    AND ddbn.trang_thai = 'dang_quan_ly'
                LEFT JOIN dieu_duong_benh_nhan ddbn2 
                    ON ddbn2.id_dieu_duong = hsnv.id
                LEFT JOIN lich_phan_ca lpc
                    ON lpc.id_tai_khoan = tk.id
                    AND DATE(lpc.ngay) = CURDATE()
                WHERE hsnv.id = ?
                GROUP BY 
                    hsnv.id,
                    hsnv.chuc_vu,
                    hsnv.chuyen_mon,
                    hsnv.so_nam_kinh_nghiem,
                    hsnv.avatar,
                    hsnv.gioi_thieu,
                    hsnv.noi_cong_tac,
                    tk.id,
                    tk.ho_ten,
                    tk.so_dien_thoai,
                    tk.vai_tro
            `;

            const [rows] = await connection.execute(query, [idDieuDuong]);
            return rows[0] || null;

        } catch (error) {
            console.error('Lỗi lấy chi tiết nhân viên:', error);
            throw error;
        }
    }
}

module.exports = NhanVien;