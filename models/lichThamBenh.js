const connection = require('../config/database');

class lichThamBenh {
    static async getThongKeLichThamBenhByDieuDuong(idDieuDuong) {
        try {
            const query = `
                SELECT 
                    ltb.*,
                    bn.ho_ten AS ten_benh_nhan,
                    bn.phong,
                    nt.ho_ten AS ten_nguoi_than,
                    nt.so_dien_thoai AS sdt_nguoi_than,
                    nt.moi_quan_he,
                    ddbn.ngay_bat_dau,
                    ddbn.ngay_ket_thuc,
                    ddbn.trang_thai AS trang_thai_quan_ly
                FROM lich_tham_benh ltb
                INNER JOIN benh_nhan bn ON ltb.id_benh_nhan = bn.id
                LEFT JOIN nguoi_than_benh_nhan nt ON ltb.id_nguoi_than = nt.id
                INNER JOIN dieu_duong_benh_nhan ddbn ON bn.id = ddbn.id_benh_nhan
                WHERE ddbn.id_dieu_duong = ?
                    AND ddbn.trang_thai = 'dang_quan_ly'
                    AND bn.da_xoa = 0
                    AND ltb.ngay >= CURDATE()
                ORDER BY ltb.ngay DESC, 
                    CASE ltb.khung_gio 
                        WHEN '8_10' THEN 1
                        WHEN '14_16' THEN 2
                        WHEN '18_20' THEN 3
                        ELSE 4
                    END,
                    ltb.ngay_tao DESC
            `;
            const [result] = await connection.query(query, [idDieuDuong]);
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy lịch thăm bệnh theo điều dưỡng:', error);
            throw error;
        }
    }

    static async getTongSoLichHen(idDieuDuong) {
        try {
            const query = `
                SELECT 
                    COUNT(*) AS tong_so,
                    SUM(CASE WHEN ltb.trang_thai = 'cho_duyet' THEN 1 ELSE 0 END) AS cho_duyet,
                    SUM(CASE WHEN ltb.trang_thai = 'da_duyet' THEN 1 ELSE 0 END) AS da_duyet,
                    SUM(CASE WHEN ltb.trang_thai = 'tu_choi' THEN 1 ELSE 0 END) AS tu_choi,
                    DATE(ltb.ngay_tao) AS ngay
                FROM lich_tham_benh ltb
                INNER JOIN benh_nhan bn ON ltb.id_benh_nhan = bn.id
                INNER JOIN dieu_duong_benh_nhan ddbn ON bn.id = ddbn.id_benh_nhan
                WHERE ddbn.id_dieu_duong = ?
                    AND ddbn.trang_thai = 'dang_quan_ly'
                    AND bn.da_xoa = 0
                    AND ltb.ngay = CURDATE()
                GROUP BY DATE(ltb.ngay_tao) 
                ORDER BY ngay DESC
                LIMIT 7  
            `;

            const [result] = await connection.query(query, [idDieuDuong]);
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thống kê lịch thăm bệnh:', error);
            throw error;
        }
    }
}

module.exports = lichThamBenh;