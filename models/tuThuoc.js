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

// Bản SQL của cùng quy tắc trên, dùng cho các câu UPDATE cần tính lại trạng thái
// ngay trong câu lệnh. Hai dấu ? đều là SỐ TỒN MỚI — caller phải push giá trị 2 lần.
//
// Cố tình truyền tồn mới qua placeholder thay vì đọc lại cột `so_luong_ton`:
// MySQL đánh giá các vế SET từ trái sang phải và vế sau đọc giá trị ĐÃ cập nhật,
// nên đọc lại cột sẽ cộng delta hai lần. Placeholder làm phép tính hiển nhiên đúng.
const SQL_TRANG_THAI_THEO_TON = `
            CASE
                WHEN han_su_dung IS NOT NULL AND han_su_dung < CURDATE() THEN 'het_han'
                WHEN ? <= 0 THEN 'het_hang'
                WHEN ? <= so_luong_toi_thieu THEN 'sap_het'
                ELSE 'con_hang'
            END`;

class TuThuocModel {
    static tinhTrangThai = tinhTrangThai;
    static SQL_TRANG_THAI_THEO_TON = SQL_TRANG_THAI_THEO_TON;

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
                tt.ngay_cap_nhat,
                CASE
                    WHEN tt.han_su_dung IS NULL THEN NULL
                    ELSE DATEDIFF(tt.han_su_dung, CURDATE())
                END AS so_ngay_con_han
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
    // Chạy định kỳ để những món vừa quá hạn đổi sang 'het_han' mà không cần ai đụng vào.
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

    // ==================== GHI DỮ LIỆU TỦ THUỐC ====================

    // Trùng tên trong cùng một phân loại thường là nhập nhầm lần hai.
    // Trả về bản ghi đang trùng để controller quyết định báo lỗi hay không.
    static async timTrung({ tenThuoc, idPhanLoai = null, boQuaId = null }) {
        let query = `
            SELECT id, ten_thuoc, so_luong_ton
            FROM tu_thuoc
            WHERE da_xoa = 0 AND ten_thuoc = ?
              AND ${idPhanLoai ? 'id_phan_loai = ?' : 'id_phan_loai IS NULL'}
        `;
        const params = idPhanLoai ? [tenThuoc, idPhanLoai] : [tenThuoc];

        if (boQuaId) {
            query += ' AND id <> ?';
            params.push(boQuaId);
        }

        const [rows] = await connection.query(query, params);
        return rows[0] || null;
    }

    static async themThuoc(data) {
        const trangThai = tinhTrangThai(
            data.so_luong_ton,
            data.so_luong_toi_thieu,
            data.han_su_dung
        );

        const [result] = await connection.query(
            `INSERT INTO tu_thuoc
                (id_phan_loai, ten_thuoc, don_vi_tinh, so_luong_ton, so_luong_toi_thieu,
                 han_su_dung, chi_dinh, ghi_chu, trang_thai, ngay_tao, ngay_cap_nhat)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                data.id_phan_loai,
                data.ten_thuoc,
                data.don_vi_tinh,
                data.so_luong_ton,
                data.so_luong_toi_thieu,
                data.han_su_dung,
                data.chi_dinh,
                data.ghi_chu,
                trangThai
            ]
        );
        return result.insertId;
    }

    // Cập nhật một phần. Chỉ ghi những trường thực sự được gửi lên, rồi tính lại
    // trạng thái từ giá trị sau khi trộn — không phụ thuộc thứ tự đánh giá của MySQL.
    static async capNhatThuoc(id, data) {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                'SELECT * FROM tu_thuoc WHERE id = ? AND da_xoa = 0 FOR UPDATE',
                [id]
            );

            const hienTai = rows[0];
            if (!hienTai) {
                const err = new Error('Không tìm thấy mục trong tủ thuốc');
                err.status = 404;
                throw err;
            }

            const COT_SUA_DUOC = [
                'id_phan_loai', 'ten_thuoc', 'don_vi_tinh', 'so_luong_ton',
                'so_luong_toi_thieu', 'han_su_dung', 'chi_dinh', 'ghi_chu'
            ];

            const capNhat = {};
            for (const cot of COT_SUA_DUOC) {
                if (data[cot] !== undefined) capNhat[cot] = data[cot];
            }

            if (Object.keys(capNhat).length === 0) {
                await conn.commit();
                return false;
            }

            const sauKhiTron = { ...hienTai, ...capNhat };
            capNhat.trang_thai = tinhTrangThai(
                sauKhiTron.so_luong_ton,
                sauKhiTron.so_luong_toi_thieu,
                sauKhiTron.han_su_dung
            );

            const cacCot = Object.keys(capNhat);
            const setClause = cacCot.map((c) => `\`${c}\` = ?`).join(', ');
            const giaTri = cacCot.map((c) => capNhat[c]);

            await conn.query(
                `UPDATE tu_thuoc SET ${setClause}, ngay_cap_nhat = NOW() WHERE id = ?`,
                [...giaTri, id]
            );

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Nhập kho: cộng thêm tồn cho một món đã có.
    // Cho phép cập nhật kèm hạn dùng vì lô mới thường có hạn khác lô cũ.
    static async nhapKho(id, { soLuong, hanSuDung = null, ghiChu = null }) {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                `SELECT id, ten_thuoc, so_luong_ton, so_luong_toi_thieu, han_su_dung, ghi_chu
                 FROM tu_thuoc
                 WHERE id = ? AND da_xoa = 0
                 FOR UPDATE`,
                [id]
            );

            const thuoc = rows[0];
            if (!thuoc) {
                const err = new Error('Không tìm thấy mục trong tủ thuốc');
                err.status = 404;
                throw err;
            }

            const tonMoi = thuoc.so_luong_ton + soLuong;
            const hanMoi = hanSuDung !== null ? hanSuDung : thuoc.han_su_dung;
            const trangThaiMoi = tinhTrangThai(tonMoi, thuoc.so_luong_toi_thieu, hanMoi);

            await conn.query(
                `UPDATE tu_thuoc
                 SET so_luong_ton = ?,
                     han_su_dung = ?,
                     ghi_chu = COALESCE(?, ghi_chu),
                     trang_thai = ?,
                     ngay_cap_nhat = NOW()
                 WHERE id = ?`,
                [tonMoi, hanMoi, ghiChu, trangThaiMoi, id]
            );

            await conn.commit();
            return { ton_truoc: thuoc.so_luong_ton, ton_sau: tonMoi, trang_thai: trangThaiMoi };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Xóa mềm. Lịch sử tiêu hao vẫn giữ nguyên đường dẫn về món này.
    static async xoaThuoc(id) {
        const [result] = await connection.query(
            'UPDATE tu_thuoc SET da_xoa = 1, ngay_xoa = NOW() WHERE id = ? AND da_xoa = 0',
            [id]
        );
        return result.affectedRows > 0;
    }

    // ==================== GHI DỮ LIỆU PHÂN LOẠI ====================

    static async timPhanLoaiTheoTen(tenLoai, boQuaId = null) {
        let query = 'SELECT id FROM phan_loai_thuoc WHERE ten_loai = ?';
        const params = [tenLoai];

        if (boQuaId) {
            query += ' AND id <> ?';
            params.push(boQuaId);
        }

        const [rows] = await connection.query(query, params);
        return rows[0] || null;
    }

    static async phanLoaiTonTai(id) {
        const [rows] = await connection.query(
            'SELECT id FROM phan_loai_thuoc WHERE id = ?',
            [id]
        );
        return rows.length > 0;
    }

    static async themPhanLoai({ tenLoai, moTa = null }) {
        const [result] = await connection.query(
            `INSERT INTO phan_loai_thuoc (ten_loai, mo_ta, ngay_tao, ngay_cap_nhat)
             VALUES (?, ?, NOW(), NOW())`,
            [tenLoai, moTa]
        );
        return result.insertId;
    }

    static async capNhatPhanLoai(id, { tenLoai, moTa }) {
        const capNhat = {};
        if (tenLoai !== undefined) capNhat.ten_loai = tenLoai;
        if (moTa !== undefined) capNhat.mo_ta = moTa;

        if (Object.keys(capNhat).length === 0) return false;

        const cacCot = Object.keys(capNhat);
        const setClause = cacCot.map((c) => `\`${c}\` = ?`).join(', ');

        const [result] = await connection.query(
            `UPDATE phan_loai_thuoc SET ${setClause}, ngay_cap_nhat = NOW() WHERE id = ?`,
            [...cacCot.map((c) => capNhat[c]), id]
        );
        return result.affectedRows > 0;
    }

    // Chặn xóa khi vẫn còn thuốc/vật tư đang dùng phân loại này,
    // tránh để lại một đống mục mồ côi không lọc được.
    static async demThuocTheoPhanLoai(idPhanLoai) {
        const [rows] = await connection.query(
            'SELECT COUNT(*) AS tong_so FROM tu_thuoc WHERE id_phan_loai = ? AND da_xoa = 0',
            [idPhanLoai]
        );
        return rows[0].tong_so;
    }

    static async xoaPhanLoai(id) {
        const [result] = await connection.query(
            'DELETE FROM phan_loai_thuoc WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = TuThuocModel;
