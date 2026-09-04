const connection = require('../config/database');
const TuThuocModel = require('./tuThuoc');

// Bảng vat_tu_tieu_hao có sẵn từ trước, tên cột thời gian chưa thống nhất giữa
// các bản triển khai (created_at / ngay_tao / ngay_them). Dò 1 lần rồi cache lại
// để câu lệnh lọc theo ngày và sắp xếp luôn dùng đúng cột.
// Trên schema hiện tại (quanlyduonglao) cột này là `ngay_tao`.
const UNG_VIEN_COT_THOI_GIAN = ['created_at', 'ngay_tao', 'ngay_them', 'thoi_gian'];

// Thiếu 2 cột này nghĩa là migration 2026_09_02_tu_thuoc.sql chưa chạy.
const COT_BAT_BUOC = ['id_tu_thuoc', 'ly_do'];

let cacheCot = null;

const layThongTinCot = async () => {
    if (cacheCot) return cacheCot;

    const [rows] = await connection.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vat_tu_tieu_hao'`
    );

    const danhSach = rows.map((r) => r.COLUMN_NAME);

    // Không cache kết quả rỗng: bảng chưa tồn tại hoặc DB chưa sẵn sàng thì lần
    // sau phải dò lại, nếu không cache hỏng sẽ sống tới lúc restart process.
    if (danhSach.length === 0) {
        const err = new Error(
            'Không đọc được cấu trúc bảng vat_tu_tieu_hao. Kiểm tra lại kết nối CSDL và migration.'
        );
        err.status = 500;
        throw err;
    }

    // Chặn ngay thay vì âm thầm bỏ cột khi INSERT: nếu deploy code trước khi chạy
    // migration, bản ghi sẽ mất liên kết id_tu_thuoc trong khi tồn kho vẫn bị trừ.
    const thieu = COT_BAT_BUOC.filter((c) => !danhSach.includes(c));
    if (thieu.length > 0) {
        const err = new Error(
            `Bảng vat_tu_tieu_hao thiếu cột: ${thieu.join(', ')}. ` +
            'Chạy sql/2026_09_02_tu_thuoc.sql rồi khởi động lại server.'
        );
        err.status = 500;
        throw err;
    }

    cacheCot = {
        danhSach,
        cotThoiGian: UNG_VIEN_COT_THOI_GIAN.find((c) => danhSach.includes(c)) || 'ngay_tao',
        // Bảng có soft delete; mọi truy vấn đọc phải lọc để không trả bản ghi đã xóa.
        coDaXoa: danhSach.includes('da_xoa')
    };
    return cacheCot;
};

// Các cột trả về cho app. id_benh_nhan để NULL được (FK ON DELETE SET NULL khi
// xóa NCT), nhưng app khai báo không nullable — trả 0 để không vỡ cả danh sách,
// khi đó ten_benh_nhan cũng NULL nên app hiển thị "Chưa chỉ định".
const COT_TRA_VE = (cotThoiGian) => `
                vt.id,
                COALESCE(vt.id_benh_nhan, 0) AS id_benh_nhan,
                vt.id_nguoi_gui,
                vt.id_tu_thuoc,
                COALESCE(vt.ten_vat_tu, '') AS ten_vat_tu,
                COALESCE(vt.so_luong, 0) AS so_luong,
                COALESCE(vt.don_vi_tinh, '') AS don_vi_tinh,
                vt.ly_do,
                COALESCE(vt.trang_thai, 'cho_duyet') AS trang_thai,
                vt.\`${cotThoiGian}\` AS created_at,
                bn.ho_ten AS ten_benh_nhan,
                tk.ho_ten AS ten_nguoi_gui,
                tt.ten_thuoc,
                pl.ten_loai AS ten_phan_loai`;

const BANG_VA_JOIN = `
            FROM vat_tu_tieu_hao vt
            LEFT JOIN benh_nhan bn ON bn.id = vt.id_benh_nhan
            LEFT JOIN ho_so_nhan_vien hsnv ON hsnv.id = vt.id_nguoi_gui
            LEFT JOIN tai_khoan tk ON tk.id = hsnv.id_tai_khoan
            LEFT JOIN tu_thuoc tt ON tt.id = vt.id_tu_thuoc
            LEFT JOIN phan_loai_thuoc pl ON pl.id = tt.id_phan_loai`;

class VatTuTieuHaoModel {
    static async getDanhSach({ tuNgay = null, denNgay = null, idBenhNhan = null, page = 1, limit = 100 }) {
        const cot = await layThongTinCot();
        const offset = (page - 1) * limit;

        let query = `
            SELECT ${COT_TRA_VE(cot.cotThoiGian)}
            ${BANG_VA_JOIN}
            WHERE ${cot.coDaXoa ? 'vt.da_xoa = 0' : '1 = 1'}
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

        let query = `SELECT COUNT(*) AS tong_so FROM vat_tu_tieu_hao vt
                     WHERE ${cot.coDaXoa ? 'vt.da_xoa = 0' : '1 = 1'}`;
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
            `SELECT ${COT_TRA_VE(cot.cotThoiGian)}
             ${BANG_VA_JOIN}
             WHERE vt.id = ? AND ${cot.coDaXoa ? 'vt.da_xoa = 0' : '1 = 1'}`,
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
                         trang_thai = ${TuThuocModel.SQL_TRANG_THAI_THEO_TON}
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
            const bieuThuc = cacCot.map(() => '?');

            // Ghi thẳng thời gian tạo thay vì chỉ trông vào DEFAULT của bảng —
            // rẻ và làm câu lệnh không phụ thuộc cấu hình cột giữa các môi trường.
            if (cot.danhSach.includes(cot.cotThoiGian)) {
                cacCot.push(cot.cotThoiGian);
                bieuThuc.push('NOW()');
            }

            const tenCot = cacCot.map((k) => `\`${k}\``).join(', ');

            const [result] = await conn.query(
                `INSERT INTO vat_tu_tieu_hao (${tenCot}) VALUES (${bieuThuc.join(', ')})`,
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

    // Cộng/trừ lại tồn kho cho một món, dùng chung cho luồng hủy và luồng xóa.
    // Bỏ qua nếu món đã bị xóa khỏi tủ thuốc — không còn tồn kho để chỉnh.
    static async _dieuChinhTonKho(conn, idTuThuoc, delta) {
        const [rows] = await conn.query(
            'SELECT so_luong_ton FROM tu_thuoc WHERE id = ? AND da_xoa = 0 FOR UPDATE',
            [idTuThuoc]
        );

        const thuoc = rows[0];
        if (!thuoc) return;

        const tonMoi = thuoc.so_luong_ton + delta;
        if (tonMoi < 0) {
            const err = new Error('Tồn kho không đủ để thực hiện thao tác này');
            err.status = 400;
            throw err;
        }

        await conn.query(
            `UPDATE tu_thuoc
             SET so_luong_ton = ?,
                 trang_thai = ${TuThuocModel.SQL_TRANG_THAI_THEO_TON}
             WHERE id = ?`,
            [tonMoi, tonMoi, tonMoi, idTuThuoc]
        );
    }

    // Đổi trạng thái. Khi hủy một bản ghi lấy từ tủ thuốc thì hoàn lại tồn kho.
    static async doiTrangThai(id, trangThaiMoi) {
        const cot = await layThongTinCot();
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                `SELECT id, id_tu_thuoc, so_luong, trang_thai
                 FROM vat_tu_tieu_hao
                 WHERE id = ? AND ${cot.coDaXoa ? 'da_xoa = 0' : '1 = 1'}
                 FOR UPDATE`,
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
                await VatTuTieuHaoModel._dieuChinhTonKho(
                    conn,
                    banGhi.id_tu_thuoc,
                    dangHuy ? banGhi.so_luong : -banGhi.so_luong
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

    // Xóa mềm. Bản ghi chưa hủy thì tồn kho vẫn đang bị trừ, nên phải hoàn lại
    // trước khi ẩn đi — nếu không số tồn sẽ hụt mà không còn dấu vết để đối chiếu.
    static async xoa(id) {
        const cot = await layThongTinCot();

        if (!cot.coDaXoa) {
            const err = new Error('Bảng vat_tu_tieu_hao không có cột da_xoa, không hỗ trợ xóa mềm');
            err.status = 400;
            throw err;
        }

        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
                `SELECT id, id_tu_thuoc, so_luong, trang_thai
                 FROM vat_tu_tieu_hao
                 WHERE id = ? AND da_xoa = 0
                 FOR UPDATE`,
                [id]
            );

            const banGhi = rows[0];
            if (!banGhi) {
                const err = new Error('Không tìm thấy bản ghi vật tư tiêu hao');
                err.status = 404;
                throw err;
            }

            if (banGhi.id_tu_thuoc && banGhi.trang_thai !== 'da_huy') {
                await VatTuTieuHaoModel._dieuChinhTonKho(conn, banGhi.id_tu_thuoc, banGhi.so_luong);
            }

            await conn.query(
                'UPDATE vat_tu_tieu_hao SET da_xoa = 1, ngay_xoa = NOW() WHERE id = ?',
                [id]
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
}

module.exports = VatTuTieuHaoModel;
