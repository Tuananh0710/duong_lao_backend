const canhBaoChiSoService = require('../services/canhBaoChiSoService');
const CanhBaoChiSo = require('../models/canhBaoChiSo');

class canhBaoChiSoController {
    /**
     * POST /api/canh_bao_chi_so
     * Gửi cảnh báo cho một bản ghi chỉ số đã được lưu trước đó.
     * Tách riêng khỏi việc lưu chỉ số (POST /api/huyet_ap, /api/nhip_tim, ...).
     */
    static async create(req, res) {
        try {
            const {
                loai_chi_so,
                id_benh_nhan,
                id_ban_ghi,
                ghi_chu,
                gui_nguoi_nha,
            } = req.body;

            if (!loai_chi_so) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp loai_chi_so',
                });
            }

            if (!id_benh_nhan && !id_ban_ghi) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp id_benh_nhan hoặc id_ban_ghi',
                });
            }

            const ketQua = await canhBaoChiSoService.guiCanhBao({
                loaiChiSo: loai_chi_so,
                idBenhNhan: id_benh_nhan ? parseInt(id_benh_nhan) : null,
                idBanGhi: id_ban_ghi ? parseInt(id_ban_ghi) : null,
                ghiChu: ghi_chu || null,
                guiNguoiNha: gui_nguoi_nha !== false,
                nguoiGui: req.user,
            });

            return res.status(ketQua.statusCode || (ketQua.success ? 200 : 400)).json({
                success: ketQua.success,
                message: ketQua.message,
                ...(ketQua.data ? { data: ketQua.data } : {}),
            });
        } catch (error) {
            console.error('Lỗi trong controller gửi cảnh báo chỉ số:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message,
            });
        }
    }

    /** GET /api/canh_bao_chi_so/loai - danh sách loại chỉ số hỗ trợ gửi cảnh báo */
    static async getDanhSachLoai(req, res) {
        try {
            const danhSach = CanhBaoChiSo.getDanhSachLoai().map((loai) => ({
                loai_chi_so: loai,
                ten: CanhBaoChiSo.getCauHinh(loai).ten,
            }));

            return res.status(200).json({ success: true, data: danhSach });
        } catch (error) {
            console.error('Lỗi trong controller getDanhSachLoai:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message,
            });
        }
    }
}

module.exports = canhBaoChiSoController;
