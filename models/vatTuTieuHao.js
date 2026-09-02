const connection = require('../config/database');

// Bảng vat_tu_tieu_hao có sẵn từ trước, tên cột thời gian chưa thống nhất giữa
// các bản triển khai (created_at / ngay_tao / ngay_them). Dò 1 lần rồi cache lại
// để câu lệnh lọc theo ngày và sắp xếp luôn dùng đúng cột.
const UNG_VIEN_COT_THOI_GIAN = ['created_at', 'ngay_tao', 'ngay_them', 'thoi_gian'];

let cacheCot = null;

const layThongTinCot = async () => {
    if (cacheCot) return cacheCot;

    const [rows] = await connection.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vat_tu_tieu_hao'`
    );

    const danhSach = rows.map((r) => r.COLUMN_NAME);
    cacheCot = {
        danhSach,
        cotThoiGian: UNG_VIEN_COT_THOI_GIAN.find((c) => danhSach.includes(c)) || 'created_at'
    };
    return cacheCot;
};

class VatTuTieuHaoModel {
    static async getDanhSach({ tuNgay = null, denNgay = null, idBenhNhan = null, page = 1, limit = 100 }) {
        const cot = await layThongTinCot();
        const offset = (page - 1) * limit;

        let query = `
            SELECT
                vt.id,
                vt.id_benh_nhan,
                vt.id_nguoi_gui,
                vt.id_tu_thuoc,
                vt.ten_vat_tu,
                COALESCE(vt.so_luong, 0) AS so_luong,
                -- App khai báo 2 trường này không nullable, trả '' thay vì NULL
                COALESCE(vt.don_vi_tinh, '') AS don_vi_tinh,
                vt.ly_do,
                COALESCE(vt.trang_thai, 'cho_duyet') AS trang_thai,
                vt.\`${cot.cotThoiGian}\` AS created_at,
                bn.ho_ten AS ten_benh_nhan,
                tk.ho_ten AS ten_nguoi_gui,
                tt.ten_thuoc,
                pl.ten_loai AS ten_phan_loai
            FROM vat_tu_tieu_hao vt
            LEFT JOIN benh_nhan bn ON bn.id = vt.id_benh_nhan
            LEFT JOIN ho_so_nhan_vien hsnv ON hsnv.id = vt.id_nguoi_gui
            LEFT JOIN tai_khoan tk ON tk.id = hsnv.id_tai_khoan
            LEFT JOIN tu_thuoc tt ON tt.id = vt.id_tu_thuoc
            LEFT JOIN phan_loai_thuoc pl ON pl.id = tt.id_phan_loai
            WHERE 1 = 1
        `;
        const params = [];

        if (tuNgay) {
            query += ` AND DATE(vt.\`${cot.cotThoiGian}\`) >= ?`;
            params.push(tuNgay);
        }
        if (denNgay) {
            query += ` AND DATE(vt.\`${cot.cotThoiGian}\`) <= ?`;
            params.push(denNgay);
        }
        if (idBenhNhan) {
            query += ' AND vt.id_benh_nhan = ?';
            params.push(idBenhNhan);
        }

        query += ` ORDER BY vt.\`${cot.cotThoiGian}\` DESC, vt.id DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await connection.query(query, params);
        return rows;
    }

    static async dem({ tuNgay = null, denNgay = null, idBenhNhan = null }) {
        const cot = await layThongTinCot();

        let query = 'SELECT COUNT(*) AS tong_so FROM vat_tu_tieu_hao vt WHERE 1 = 1';
        const params = [];

        if (tuNgay) {
            query += ` AND DATE(vt.\`${cot.cotThoiGian}\`) >= ?`;
            params.push(tuNgay);
        }
        if (denNgay) {
            query += ` AND DATE(vt.\`${cot.cotThoiGian}\`) <= ?`;
            params.push(denNgay);
        }
        if (idBenhNhan) {
            query += ' AND vt.id_benh_nhan = ?';
            params.push(idBenhNhan);
        }

        const [rows] = await connection.query(query, params);
        return rows[0].tong_so;
    }

    static async getChiTiet(id) {
        const cot = await layThongTinCot();
        const [rows] = await connection.query(
            `SELECT vt.*, vt.\`${cot.cotThoiGian}\` AS created_at
             FROM vat_tu_tieu_hao vt
             WHERE vt.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    // Tạo bản ghi tiêu hao. Nếu lấy từ tủ thuốc (có id_tu_thuoc) thì trừ tồn kho
    // ngay trong cùng transaction để không âm kho khi 2 điều dưỡng cùng lấy.
    static async them(data) {
        const cot = await layThongTinCot();
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            let tenVatTu = data.ten_vat_tu;
            let donViTinh = data.don_vi_tinh;

            if (data.id_tu_thuoc) {
                const [thuocRows] = await conn.query(
                    `SELECT id, ten_thuoc, don_vi_tinh, so_luong_ton, so_luong_toi_thieu, han_su_dung
                     FROM tu_thuoc
                     WHERE id = ? AND da_xoa = 0
                     FOR UPDATE`,
                    [data.id_tu_thuoc]
                );

                const thuoc = thuocRows[0];
                if (!thuoc) {
                    const err = new Error('Không tìm thấy thuốc/vật tư trong tủ thuốc');
                    err.status = 404;
                    throw err;
                }

                if (thuoc.han_su_dung) {
                    const hetHan = new Date(thuoc.han_su_dung);
                    const homNay = new Date();
                    homNay.setHours(0, 0, 0, 0);
                    if (hetHan < homNay) {
                        const err = new Error(`"${thuoc.ten_thuoc}" đã hết hạn sử dụng, không thể xuất dùng`);
                        err.status = 400;
                        throw err;
                    }
                }

                if (thuoc.so_luong_ton < data.so_luong) {
                    const donVi = thuoc.don_vi_tinh || '';
                    const err = new Error(
                        `Tồn kho không đủ: "${thuoc.ten_thuoc}" chỉ còn ${thuoc.so_luong_ton} ${donVi}`.trim()
                    );
                    err.status = 400;
                    throw err;
                }

                // Tên và đơn vị tính luôn lấy theo tủ thuốc để dữ liệu không lệch nhau
                tenVatTu = thuoc.ten_thuoc;
                donViTinh = thuoc.don_vi_tinh || donViTinh;

                const tonMoi = thuoc.so_luong_ton - data.so_luong;
                await conn.query(
                    `UPDATE tu_thuoc
                     SET so_luong_ton = ?,
                         trang_thai = CASE
                            WHEN han_su_dung IS NOT NULL AND han_su_dung < CURDATE() THEN 'het_han'
                            WHEN ? <= 0 THEN 'het_hang'
                            WHEN ? <= so_luong_toi_thieu THEN 'sap_het'
                            ELSE 'con_hang'
                         END
                     WHERE id = ?`,
                    [tonMoi, tonMoi, tonMoi, data.id_tu_thuoc]
                );
            }

            // Chỉ ghi những cột thực sự có trong bảng, tránh vỡ khi schema
            // giữa các môi trường lệch nhau.
            const duLieu = {
                id_benh_nhan: data.id_benh_nhan,
                id_nguoi_gui: data.id_nguoi_gui || null,
                id_tu_thuoc: data.id_tu_thuoc || null,
                ten_vat_tu: tenVatTu,
                so_luong: data.so_luong,
                don_vi_tinh: donViTinh || null,
                ly_do: data.ly_do || null,
                trang_thai: data.trang_thai
            };

            const cacCot = Object.keys(duLieu).filter((k) => cot.danhSach.includes(k));
            const giaTri = cacCot.map((k) => duLieu[k]);
            const dauHoi = cacCot.map(() => '?').join(', ');
            const tenCot = cacCot.map((k) => `\`${k}\``).join(', ');

            const [result] = await conn.query(
                `INSERT INTO vat_tu_tieu_hao (${tenCot}) VALUES (${dauHoi})`,
                giaTri
            );

            await conn.commit();
            return result.insertId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Đổi trạng thái. Khi hủy một bản ghi lấy từ tủ thuốc thì hoàn lại tồn kho.
    static async doiTrangThai(id, trangThaiMoi) {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                'SELECT id, id_tu_thuoc, so_luong, trang_thai FROM vat_tu_tieu_hao WHERE id = ? FOR UPDATE',
                [id]
            );

            const banGhi = rows[0];
            if (!banGhi) {
                const err = new Error('Không tìm thấy bản ghi vật tư tiêu hao');
                err.status = 404;
                throw err;
            }

            if (banGhi.trang_thai === trangThaiMoi) {
                await conn.commit();
                return false;
            }

            const dangHuy = trangThaiMoi === 'da_huy';
            const truocDoDaHuy = banGhi.trang_thai === 'da_huy';

            // dangHuy      -> cộng trả lại kho
            // truocDoDaHuy -> mở lại bản ghi đã hủy, trừ kho lần nữa
            if (banGhi.id_tu_thuoc && (dangHuy || truocDoDaHuy)) {
                const delta = dangHuy ? banGhi.so_luong : -banGhi.so_luong;

                if (!dangHuy) {
                    const [thuocRows] = await conn.query(
                        'SELECT so_luong_ton FROM tu_thuoc WHERE id = ? AND da_xoa = 0 FOR UPDATE',
                        [banGhi.id_tu_thuoc]
                    );
                    const thuoc = thuocRows[0];
                    if (!thuoc || thuoc.so_luong_ton < banGhi.so_luong) {
                        const err = new Error('Tồn kho không đủ để mở lại bản ghi này');
                        err.status = 400;
                        throw err;
                    }
                }

                await conn.query(
                    `UPDATE tu_thuoc
                     SET so_luong_ton = so_luong_ton + ?,
                         trang_thai = CASE
                            WHEN han_su_dung IS NOT NULL AND han_su_dung < CURDATE() THEN 'het_han'
                            WHEN so_luong_ton + ? <= 0 THEN 'het_hang'
                            WHEN so_luong_ton + ? <= so_luong_toi_thieu THEN 'sap_het'
                            ELSE 'con_hang'
                         END
                     WHERE id = ?`,
                    [delta, delta, delta, banGhi.id_tu_thuoc]
                );
            }

            await conn.query('UPDATE vat_tu_tieu_hao SET trang_thai = ? WHERE id = ?', [trangThaiMoi, id]);

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = VatTuTieuHaoModel;
