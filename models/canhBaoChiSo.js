const connection = require('../config/database');

/**
 * Cấu hình cho từng loại chỉ số sức khoẻ.
 * `bang` được nội suy thẳng vào câu SQL nên CHỈ được lấy từ whitelist này,
 * tuyệt đối không nhận tên bảng từ client.
 */
const CAU_HINH_CHI_SO = {
    huyet_ap: {
        bang: 'huyet_ap',
        ten: 'Huyết áp',
        moTaGiaTri: (r) => `${r.tam_thu}/${r.tam_truong} mmHg`,
    },
    nhip_tim: {
        bang: 'nhip_tim',
        ten: 'Nhịp tim',
        moTaGiaTri: (r) => `${r.gia_tri_nhip_tim} lần/phút`,
    },
    nhiet_do: {
        bang: 'nhiet_do',
        ten: 'Nhiệt độ',
        moTaGiaTri: (r) => `${r.gia_tri_nhiet_do} °C`,
    },
    duong_huyet: {
        bang: 'duong_huyet',
        ten: 'Đường huyết',
        moTaGiaTri: (r) => `${r.gia_tri_duong_huyet} mg/dL`,
    },
    spo2: {
        bang: 'spo2',
        ten: 'SpO2',
        moTaGiaTri: (r) => `${r.gia_tri_spo2} %`,
    },
};

class CanhBaoChiSo {
    static getCauHinh(loaiChiSo) {
        return CAU_HINH_CHI_SO[loaiChiSo] || null;
    }

    static getDanhSachLoai() {
        return Object.keys(CAU_HINH_CHI_SO);
    }

    /** Lấy bản ghi chỉ số theo id (kèm thông tin bệnh nhân) */
    static async findRecord(loaiChiSo, id) {
        const cauHinh = this.getCauHinh(loaiChiSo);
        if (!cauHinh) return null;

        const [rows] = await connection.execute(
            `SELECT cs.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
             FROM ${cauHinh.bang} cs
             LEFT JOIN benh_nhan bn ON cs.id_benh_nhan = bn.id
             WHERE cs.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    /** Lấy bản ghi mới nhất của bệnh nhân, dùng khi app không gửi kèm id bản ghi */
    static async findLatestRecord(loaiChiSo, idBenhNhan) {
        const cauHinh = this.getCauHinh(loaiChiSo);
        if (!cauHinh) return null;

        const [rows] = await connection.execute(
            `SELECT cs.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
             FROM ${cauHinh.bang} cs
             LEFT JOIN benh_nhan bn ON cs.id_benh_nhan = bn.id
             WHERE cs.id_benh_nhan = ?
             ORDER BY cs.thoi_gian_do DESC, cs.id DESC
             LIMIT 1`,
            [idBenhNhan]
        );
        return rows[0] || null;
    }

    /**
     * Đánh dấu bản ghi đã được gửi cảnh báo.
     * Các cột da_gui_canh_bao/thoi_gian_gui_canh_bao/id_nguoi_gui_canh_bao được
     * thêm bởi sql/2026_08_28_tach_luu_va_gui_canh_bao.sql. Nếu DB chưa chạy
     * migration thì chỉ ghi log cảnh báo chứ không làm hỏng luồng gửi.
     */
    static async markAsWarned(loaiChiSo, id, idNguoiGui) {
        const cauHinh = this.getCauHinh(loaiChiSo);
        if (!cauHinh) return false;

        try {
            await connection.execute(
                `UPDATE ${cauHinh.bang}
                 SET da_gui_canh_bao = 1,
                     thoi_gian_gui_canh_bao = NOW(),
                     id_nguoi_gui_canh_bao = ?
                 WHERE id = ?`,
                [idNguoiGui || null, id]
            );
            return true;
        } catch (error) {
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                console.warn(
                    `⚠️ Bảng ${cauHinh.bang} chưa có cột da_gui_canh_bao. ` +
                    'Hãy chạy sql/2026_08_28_tach_luu_va_gui_canh_bao.sql'
                );
                return false;
            }
            throw error;
        }
    }

    /** Điều dưỡng trưởng / quản lý y tế - cấp nhận cảnh báo */
    static async getCapQuanLy() {
        const [rows] = await connection.query(
            `SELECT id, ho_ten, vai_tro
             FROM tai_khoan
             WHERE vai_tro IN ('dieu_duong_truong', 'quan_ly_y_te')
               AND trang_thai = 'active'
               AND da_xoa = 0`
        );
        return rows;
    }

    /** Điều dưỡng đang quản lý bệnh nhân */
    static async getDieuDuongCuaBenhNhan(idBenhNhan) {
        const [rows] = await connection.query(
            `SELECT DISTINCT tk.id, tk.ho_ten, tk.vai_tro
             FROM dieu_duong_benh_nhan ddbn
             JOIN ho_so_nhan_vien hsnv ON ddbn.id_dieu_duong = hsnv.id
             JOIN tai_khoan tk ON hsnv.id_tai_khoan = tk.id
             WHERE ddbn.id_benh_nhan = ?
               AND ddbn.trang_thai = 'dang_quan_ly'
               AND tk.vai_tro IN ('dieu_duong', 'dieu_duong_truong')
               AND tk.trang_thai = 'active'
               AND tk.da_xoa = 0`,
            [idBenhNhan]
        );
        return rows;
    }

    /** Người nhà của bệnh nhân (chỉ lấy người đã có tài khoản) */
    static async getNguoiNhaCuaBenhNhan(idBenhNhan) {
        const [rows] = await connection.query(
            `SELECT DISTINCT tk.id, tk.ho_ten, ntbn.moi_quan_he
             FROM nguoi_than_benh_nhan ntbn
             JOIN tai_khoan tk ON ntbn.id_tai_khoan = tk.id
             WHERE ntbn.id_benh_nhan = ?
               AND tk.trang_thai = 'active'
               AND tk.da_xoa = 0`,
            [idBenhNhan]
        );
        return rows;
    }

    /** Token FCM của một danh sách tài khoản */
    static async getTokensCuaTaiKhoan(idTaiKhoans) {
        if (!idTaiKhoans || idTaiKhoans.length === 0) return [];

        const placeholders = idTaiKhoans.map(() => '?').join(',');
        const [rows] = await connection.query(
            `SELECT token FROM fcm_tokens
             WHERE tai_khoan_id IN (${placeholders}) AND is_active = 1`,
            idTaiKhoans
        );
        return rows.map((r) => r.token).filter(Boolean);
    }
}

module.exports = CanhBaoChiSo;
module.exports.CAU_HINH_CHI_SO = CAU_HINH_CHI_SO;
