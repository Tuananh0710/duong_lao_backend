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
    COUNT(*) AS tong_so
FROM lich_tham_benh ltb
INNER JOIN benh_nhan bn ON ltb.id_benh_nhan = bn.id
INNER JOIN dieu_duong_benh_nhan ddbn ON bn.id = ddbn.id_benh_nhan
WHERE ddbn.id_dieu_duong = ?
    AND ddbn.trang_thai = 'dang_quan_ly'
    AND bn.da_xoa = 0
    AND ltb.ngay = CURDATE()
    AND ltb.trang_thai = 'da_duyet'
GROUP BY DATE(ltb.ngay_tao), ltb.ngay  -- Thêm cột ngày vào GROUP BY
ORDER BY ngay DESC
LIMIT 1
        `;

            const [result] = await connection.query(query, [idDieuDuong]);
            return result[0] ? result[0].tong_so : 0;
        } catch (error) {
            console.error('Lỗi khi lấy thống kê lịch thăm bệnh:', error);
            throw error;
        }
    }
    static async getLichLastestByNguoiThanBenhNhan(id_nguoi_than, id_benh_nhan) {
        try {
            const query = `
            SELECT 
                ltb.ngay,
                ltb.khung_gio,
                ltb.id_benh_nhan,
                ltb.id_nguoi_than
            FROM lich_tham_benh ltb
            WHERE ltb.id_benh_nhan=? AND ltb.id_nguoi_than=? AND ltb.trang_thai = 'da_duyet' AND ltb.ngay >= CURDATE()
            ORDER BY ltb.ngay ASC
            LIMIT 1
            `
            if (!id_benh_nhan || !id_nguoi_than) {
                throw new Error('thieu tham so can thiet !');
            }
            const [rows] = await connection.execute(query, [id_benh_nhan, id_nguoi_than]);
            return rows[0] || null  
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu lịch hẹn gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu lịch hẹn gần nhất: ' + error.message);
        }
    }
static async themLichThamMoi(
    id_nguoi_than,
    id_benh_nhan,
    ngay,
    khung_gio,
    loai,
    so_nguoi_di_cung,
    ghi_chu,
    trang_thai
) {
    try {
        const query = `
            INSERT INTO lich_tham_benh
            (
                id_nguoi_than,
                id_benh_nhan,
                ngay,
                khung_gio,
                loai,
                so_nguoi_di_cung,
                ghi_chu,
                trang_thai,
                ngay_tao,
                ngay_cap_nhat
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const values = [
            id_nguoi_than,
            id_benh_nhan,
            ngay,
            khung_gio,
            loai,
            so_nguoi_di_cung,
            ghi_chu,
            trang_thai
        ];

        const [result] = await connection.execute(query, values);

        return {
            success: true,
            insertId: result.insertId
        };
    } catch (error) {
        console.error('Lỗi thêm lịch thăm:', error);
        return {
            success: false,
            message: 'Thêm lịch thăm thất bại'
        };
    }
}

}
module.exports = lichThamBenh;