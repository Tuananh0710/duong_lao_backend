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
                    hsnv.chuc_vu,
                    tk.so_dien_thoai
                FROM dieu_duong_benh_nhan ddbn
                JOIN ho_so_nhan_vien hsnv 
                    ON ddbn.id_dieu_duong = hsnv.id
                JOIN tai_khoan tk 
                    ON hsnv.id_tai_khoan = tk.id
                WHERE ddbn.id_benh_nhan = ?
                  AND ddbn.trang_thai = 'dang_quan_ly'
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
                    ddbn.trang_thai,

                    hsnv.id AS id_dieu_duong,
                    hsnv.chuc_vu,
                    hsnv.chuyen_mon,
                    hsnv.so_nam_kinh_nghiem,
                    hsnv.avatar,
                    hsnv.gioi_thieu,
                    hsnv.noi_cong_tac,
                    hsnv.lich_lam_viec,
                    hsnv.danh_gia AS so_sao,

                    tk.ho_ten,
                    tk.so_dien_thoai,

                    COUNT(DISTINCT ddbn2.id_benh_nhan) AS so_benh_nhan_da_dieu_tri

                FROM ho_so_nhan_vien hsnv

                JOIN tai_khoan tk 
                    ON hsnv.id_tai_khoan = tk.id

                LEFT JOIN dieu_duong_benh_nhan ddbn
                    ON ddbn.id_dieu_duong = hsnv.id
                   AND ddbn.trang_thai = 'dang_quan_ly'

                LEFT JOIN dieu_duong_benh_nhan ddbn2 
                    ON ddbn2.id_dieu_duong = hsnv.id

                WHERE hsnv.id = ?

                GROUP BY 
                    hsnv.id,
                    tk.id,
                    ddbn.trang_thai
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
