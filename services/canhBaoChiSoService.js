// services/canhBaoChiSoService.js
const CanhBaoChiSo = require('../models/canhBaoChiSo');
const ThongBao = require('../models/ThongBao');
const notificationService = require('./notificationService');

// Loại thông báo dành cho cảnh báo chỉ số sức khoẻ. Nếu DB chưa mở rộng ENUM
// `thong_bao.loai` thì tự động fallback sang loại đã có sẵn.
const LOAI_THONG_BAO = 'canh_bao_suc_khoe';
const LOAI_THONG_BAO_FALLBACK = 'cong_viec';

const NHAN_MUC_DO = {
    nguy_hiem: { icon: '🚨', nhan: 'NGUY HIỂM' },
    canh_bao: { icon: '⚠️', nhan: 'CẢNH BÁO' },
    binh_thuong: { icon: 'ℹ️', nhan: 'Bình thường' },
};

class CanhBaoChiSoService {
    /**
     * Gửi cảnh báo cho một bản ghi chỉ số đã lưu.
     *
     * @param {Object} params
     * @param {string} params.loaiChiSo   huyet_ap | nhip_tim | nhiet_do | duong_huyet | spo2
     * @param {number} params.idBenhNhan
     * @param {number} [params.idBanGhi]  id bản ghi chỉ số; bỏ trống thì lấy bản mới nhất
     * @param {string} [params.ghiChu]    ghi chú thêm của điều dưỡng
     * @param {boolean} [params.guiNguoiNha=true]
     * @param {Object} [params.nguoiGui]  req.user
     */
    async guiCanhBao({
        loaiChiSo,
        idBenhNhan,
        idBanGhi = null,
        ghiChu = null,
        guiNguoiNha = true,
        nguoiGui = null,
    }) {
        const cauHinh = CanhBaoChiSo.getCauHinh(loaiChiSo);
        if (!cauHinh) {
            return {
                success: false,
                statusCode: 400,
                message: `Loại chỉ số không hợp lệ. Chỉ chấp nhận: ${CanhBaoChiSo.getDanhSachLoai().join(', ')}`,
            };
        }

        // 1. Lấy bản ghi cần cảnh báo
        const banGhi = idBanGhi
            ? await CanhBaoChiSo.findRecord(loaiChiSo, idBanGhi)
            : await CanhBaoChiSo.findLatestRecord(loaiChiSo, idBenhNhan);

        if (!banGhi) {
            return {
                success: false,
                statusCode: 404,
                message: 'Không tìm thấy bản ghi chỉ số để gửi cảnh báo. Vui lòng lưu chỉ số trước.',
            };
        }

        if (idBenhNhan && Number(banGhi.id_benh_nhan) !== Number(idBenhNhan)) {
            return {
                success: false,
                statusCode: 400,
                message: 'Bản ghi chỉ số không thuộc về bệnh nhân này',
            };
        }

        // 2. Soạn nội dung cảnh báo
        const noiDung = this.taoNoiDungCanhBao(cauHinh, banGhi, ghiChu);

        // 3. Xác định người nhận
        const nguoiNhan = await this.layDanhSachNguoiNhan(banGhi.id_benh_nhan, guiNguoiNha);
        if (nguoiNhan.length === 0) {
            return {
                success: false,
                statusCode: 404,
                message: 'Không tìm thấy người nhận cảnh báo cho bệnh nhân này',
            };
        }

        // 4. Đẩy FCM
        const idTaiKhoans = nguoiNhan.map((n) => n.id);
        const tokens = await CanhBaoChiSo.getTokensCuaTaiKhoan(idTaiKhoans);

        let ketQuaFCM = { success: true, sentCount: 0 };
        if (tokens.length > 0) {
            ketQuaFCM = await notificationService.sendToTokens(
                tokens,
                { title: noiDung.tieuDe, body: noiDung.noiDung },
                {
                    type: 'CANH_BAO_CHI_SO',
                    loaiChiSo,
                    idBanGhi: String(banGhi.id),
                    idBenhNhan: String(banGhi.id_benh_nhan),
                    tenBenhNhan: banGhi.ho_ten || '',
                    mucDo: banGhi.muc_do || 'binh_thuong',
                    giaTri: noiDung.giaTri,
                    screen: 'PatientDetail',
                    action: 'view_vital',
                }
            );
        }

        // 5. Lưu thông báo vào DB cho từng người nhận
        const link = `/benh-nhan/${banGhi.id_benh_nhan}/chi-so/${loaiChiSo}/${banGhi.id}`;
        let soThongBaoDaLuu = 0;
        for (const nguoi of nguoiNhan) {
            const daLuu = await this.luuThongBao({
                idNguoiNhan: nguoi.id,
                tieuDe: noiDung.tieuDe,
                noiDung: noiDung.noiDung,
                link,
            });
            if (daLuu) soThongBaoDaLuu++;
        }

        // 6. Đánh dấu bản ghi đã gửi cảnh báo
        const daDanhDau = await CanhBaoChiSo.markAsWarned(
            loaiChiSo,
            banGhi.id,
            nguoiGui ? nguoiGui.id_tai_khoan : null
        );

        return {
            success: true,
            statusCode: 200,
            message: 'Gửi cảnh báo thành công',
            data: {
                id_ban_ghi: banGhi.id,
                loai_chi_so: loaiChiSo,
                id_benh_nhan: banGhi.id_benh_nhan,
                ten_benh_nhan: banGhi.ho_ten || null,
                muc_do: banGhi.muc_do || 'binh_thuong',
                gia_tri: noiDung.giaTri,
                tieu_de: noiDung.tieuDe,
                noi_dung: noiDung.noiDung,
                so_nguoi_nhan: nguoiNhan.length,
                so_thong_bao_da_luu: soThongBaoDaLuu,
                so_thiet_bi_da_gui: ketQuaFCM.sentCount || 0,
                da_danh_dau_canh_bao: daDanhDau,
            },
        };
    }

    /** Soạn tiêu đề + nội dung cảnh báo từ bản ghi chỉ số */
    taoNoiDungCanhBao(cauHinh, banGhi, ghiChuThem) {
        const mucDo = banGhi.muc_do || 'binh_thuong';
        const { icon, nhan } = NHAN_MUC_DO[mucDo] || NHAN_MUC_DO.binh_thuong;

        const giaTri = cauHinh.moTaGiaTri(banGhi);
        const tenBenhNhan = banGhi.ho_ten || `Bệnh nhân #${banGhi.id_benh_nhan}`;

        const tieuDe = `${icon} ${nhan} - ${cauHinh.ten}`;

        const cacDong = [`${tenBenhNhan}: ${cauHinh.ten} ${giaTri}`];
        if (banGhi.danh_gia_chi_tiet) {
            cacDong.push(`Đánh giá: ${banGhi.danh_gia_chi_tiet}`);
        }
        if (banGhi.noi_dung_canh_bao) {
            cacDong.push(banGhi.noi_dung_canh_bao);
        }
        if (banGhi.thoi_gian_do) {
            cacDong.push(`Đo lúc: ${this.dinhDangThoiGian(banGhi.thoi_gian_do)}`);
        }
        const ghiChu = ghiChuThem || banGhi.ghi_chu;
        if (ghiChu) {
            cacDong.push(`Ghi chú: ${ghiChu}`);
        }

        return { tieuDe, noiDung: cacDong.join('\n'), giaTri };
    }

    dinhDangThoiGian(thoiGian) {
        const d = new Date(thoiGian);
        if (isNaN(d.getTime())) return String(thoiGian);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
            `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    /** Cấp quản lý + điều dưỡng phụ trách + (tuỳ chọn) người nhà, đã khử trùng lặp */
    async layDanhSachNguoiNhan(idBenhNhan, guiNguoiNha) {
        const [capQuanLy, dieuDuong, nguoiNha] = await Promise.all([
            CanhBaoChiSo.getCapQuanLy(),
            CanhBaoChiSo.getDieuDuongCuaBenhNhan(idBenhNhan),
            guiNguoiNha
                ? CanhBaoChiSo.getNguoiNhaCuaBenhNhan(idBenhNhan)
                : Promise.resolve([]),
        ]);

        const theoId = new Map();
        for (const nguoi of [...capQuanLy, ...dieuDuong, ...nguoiNha]) {
            if (nguoi && nguoi.id && !theoId.has(nguoi.id)) {
                theoId.set(nguoi.id, nguoi);
            }
        }
        return Array.from(theoId.values());
    }

    /** Lưu thông báo, tự fallback loại nếu ENUM chưa được mở rộng */
    async luuThongBao({ idNguoiNhan, tieuDe, noiDung, link }) {
        try {
            await ThongBao.create({
                id_nguoi_nhan: idNguoiNhan,
                loai: LOAI_THONG_BAO,
                tieu_de: tieuDe,
                noi_dung: noiDung,
                link,
            });
            return true;
        } catch (error) {
            const enumChuaHoTro =
                error.code === 'WARN_DATA_TRUNCATED' ||
                error.code === 'ER_DATA_TOO_LONG' ||
                error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD';

            if (!enumChuaHoTro) {
                console.error('Lỗi khi lưu thông báo cảnh báo chỉ số:', error);
                return false;
            }

            try {
                await ThongBao.create({
                    id_nguoi_nhan: idNguoiNhan,
                    loai: LOAI_THONG_BAO_FALLBACK,
                    tieu_de: tieuDe,
                    noi_dung: noiDung,
                    link,
                });
                console.warn(
                    `⚠️ thong_bao.loai chưa có '${LOAI_THONG_BAO}', đã lưu tạm với ` +
                    `'${LOAI_THONG_BAO_FALLBACK}'. Xem sql/2026_08_28_tach_luu_va_gui_canh_bao.sql`
                );
                return true;
            } catch (fallbackError) {
                console.error('Lỗi khi lưu thông báo (fallback):', fallbackError);
                return false;
            }
        }
    }
}

module.exports = new CanhBaoChiSoService();
