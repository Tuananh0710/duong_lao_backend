const connection = require('../config/database');

// Tính lại trạng thái tồn kho của 1 món trong tủ thuốc.
// Hết hạn được ưu tiên trước vì dù còn tồn cũng không dùng được.
const tinhTrangThai = (soLuongTon, soLuongToiThieu, hanSuDung) => {
    if (hanSuDung) {
        const hetHan = new Date(hanSuDung);
        const homNay = new Date();
        homNay.setHours(0, 0, 0, 0);
        if (hetHan < homNay) return 'het_han';
    }
    if (soLuongTon <= 0) return 'het_hang';
    if (soLuongTon <= (soLuongToiThieu || 0)) return 'sap_het';
    return 'con_hang';
};

class TuThuocModel {
    static tinhTrangThai = tinhTrangThai;

    static async getDsPhanLoai() {
        const query = `
            SELECT
                pl.id,
                pl.ten_loai,
                pl.mo_ta,
                COUNT(tt.id) AS so_luong_thuoc
            FROM phan_loai_thuoc pl
            LEFT JOIN tu_thuoc tt ON tt.id_phan_loai = pl.id AND tt.da_xoa = 0
            GROUP BY pl.id, pl.ten_loai, pl.mo_ta
            ORDER BY pl.ten_loai ASC
        `;
        const [rows] = await connection.query(query);
        return rows;
    }

    static async demDsThuoc({ search = '', idPhanLoai = null, trangThai = null }) {
        let query = `
            SELECT COUNT(*) AS tong_so
            FROM tu_thuoc tt
            WHERE tt.da_xoa = 0
        `;
        const params = [];

        if (search) {
            query += ' AND tt.ten_thuoc LIKE ?';
            params.push(`%${search}%`);
        }
        if (idPhanLoai) {
            query += ' AND tt.id_phan_loai = ?';
            params.push(idPhanLoai);
        }
        if (trangThai) {
            query += ' AND tt.trang_thai = ?';
            params.push(trangThai);
        }

        const [rows] = await connection.query(query, params);
        return rows[0].tong_so;
    }

    static async getDsThuoc({ search = '', idPhanLoai = null, trangThai = null, page = 1, limit = 50 }) {
        const offset = (page - 1) * limit;
        let query = `
            SELECT
                tt.id,
                tt.id_phan_loai,
                pl.ten_loai,
                tt.ten_thuoc,
                tt.don_vi_tinh,
                tt.so_luong_ton,
                tt.so_luong_toi_thieu,
                tt.han_su_dung,
                tt.chi_dinh,
                tt.trang_thai,
                tt.ghi_chu,
                tt.ngay_tao,
                tt.ngay_cap_nhat,
                CASE
                    WHEN tt.han_su_dung IS NULL THEN NULL
                    ELSE DATEDIFF(tt.han_su_dung, CURDATE())
                END AS so_ngay_con_han
            FROM tu_thuoc tt
            LEFT JOIN phan_loai_thuoc pl ON pl.id = tt.id_phan_loai
            WHERE tt.da_xoa = 0
        `;
        const params = [];

        if (search) {
            query += ' AND tt.ten_thuoc LIKE ?';
            params.push(`%${search}%`);
        }
        if (idPhanLoai) {
            query += ' AND tt.id_phan_loai = ?';
            params.push(idPhanLoai);
        }
        if (trangThai) {
            query += ' AND tt.trang_thai = ?';
            params.push(trangThai);
        }

        // Ưu tiên đẩy món đang có vấn đề (hết hàng / sắp hết / hết hạn) lên đầu
        query += `
            ORDER BY
                FIELD(tt.trang_thai, 'het_hang', 'het_han', 'sap_het', 'con_hang'),
                tt.ten_thuoc ASC
            LIMIT ? OFFSET ?
        `;
        params.push(limit, offset);

        const [rows] = await connection.query(query, params);
        return rows;
    }

    static async getChiTiet(id) {
        const query = `
            SELECT
                tt.id,
                tt.id_phan_loai,
                pl.ten_loai,
                tt.ten_thuoc,
                tt.don_vi_tinh,
                tt.so_luong_ton,
                tt.so_luong_toi_thieu,
                tt.han_su_dung,
                tt.chi_dinh,
                tt.trang_thai,
                tt.ghi_chu,
                tt.ngay_tao,
                tt.ngay_cap_nhat
            FROM tu_thuoc tt
            LEFT JOIN phan_loai_thuoc pl ON pl.id = tt.id_phan_loai
            WHERE tt.id = ? AND tt.da_xoa = 0
        `;
        const [rows] = await connection.query(query, [id]);
        return rows[0] || null;
    }

    static async thongKe() {
        const query = `
            SELECT
                COUNT(*) AS tong_so_muc,
                COALESCE(SUM(so_luong_ton), 0) AS tong_ton_kho,
                SUM(trang_thai = 'con_hang') AS con_hang,
                SUM(trang_thai = 'sap_het') AS sap_het,
                SUM(trang_thai = 'het_hang') AS het_hang,
                SUM(trang_thai = 'het_han') AS het_han,
                SUM(
                    han_su_dung IS NOT NULL
                    AND han_su_dung >= CURDATE()
                    AND han_su_dung <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                ) AS sap_het_han_30_ngay
            FROM tu_thuoc
            WHERE da_xoa = 0
        `;
        const [rows] = await connection.query(query);
        const r = rows[0] || {};
        return {
            tong_so_muc: Number(r.tong_so_muc || 0),
            tong_ton_kho: Number(r.tong_ton_kho || 0),
            con_hang: Number(r.con_hang || 0),
            sap_het: Number(r.sap_het || 0),
            het_hang: Number(r.het_hang || 0),
            het_han: Number(r.het_han || 0),
            sap_het_han_30_ngay: Number(r.sap_het_han_30_ngay || 0)
        };
    }

    // Đồng bộ lại trang_thai theo tồn kho + hạn dùng hiện tại.
    // Dùng khi tồn kho vừa thay đổi hoặc chạy định kỳ.
    static async dongBoTrangThai(conn = connection) {
        const query = `
            UPDATE tu_thuoc
            SET trang_thai = CASE
                WHEN han_su_dung IS NOT NULL AND han_su_dung < CURDATE() THEN 'het_han'
                WHEN so_luong_ton <= 0 THEN 'het_hang'
                WHEN so_luong_ton <= so_luong_toi_thieu THEN 'sap_het'
                ELSE 'con_hang'
            END
            WHERE da_xoa = 0
        `;
        const [result] = await conn.query(query);
        return result.affectedRows;
    }
}

module.exports = TuThuocModel;
