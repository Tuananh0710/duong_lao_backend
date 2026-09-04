// controllers/vatTuTieuHaoController.js
const VatTuTieuHaoModel = require('../models/vatTuTieuHao');

const TRANG_THAI_HOP_LE = ['cho_duyet', 'da_duyet', 'da_su_dung', 'da_huy'];

// Không cho tạo thẳng bản ghi đã hủy: tồn kho bị trừ ngay lúc tạo, mà phần hoàn
// kho chỉ chạy khi CHUYỂN sang 'da_huy'. Tạo thẳng sẽ làm kho hụt vĩnh viễn.
const TRANG_THAI_TAO_MOI = ['cho_duyet', 'da_duyet', 'da_su_dung'];

const loi = (res, status, message) =>
    res.status(status).json({ success: false, message });

const vatTuTieuHaoController = {
    getDanhSach: async (req, res) => {
        try {
            const { tu_ngay, den_ngay, id_benh_nhan } = req.query;

            const page = Math.max(parseInt(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);

            if (id_benh_nhan && isNaN(id_benh_nhan)) {
                return loi(res, 400, 'ID bệnh nhân không hợp lệ');
            }

            const dieuKien = {
                tuNgay: tu_ngay || null,
                denNgay: den_ngay || null,
                idBenhNhan: id_benh_nhan ? parseInt(id_benh_nhan) : null
            };

            const [danhSach, tongSo] = await Promise.all([
                VatTuTieuHaoModel.getDanhSach({ ...dieuKien, page, limit }),
                VatTuTieuHaoModel.dem(dieuKien)
            ]);

            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách vật tư tiêu hao thành công',
                data: danhSach,
                phan_trang: {
                    trang_hien_tai: page,
                    so_dong: limit,
                    tong_so: tongSo,
                    tong_trang: Math.ceil(tongSo / limit)
                }
            });
        } catch (error) {
            console.error('Lỗi controller lấy danh sách vật tư tiêu hao:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    },

    getChiTiet: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID bản ghi không hợp lệ');
            }

            const banGhi = await VatTuTieuHaoModel.getChiTiet(parseInt(id));

            if (!banGhi) {
                return loi(res, 404, 'Không tìm thấy bản ghi vật tư tiêu hao');
            }

            return res.status(200).json({
                success: true,
                message: 'Lấy chi tiết vật tư tiêu hao thành công',
                data: banGhi
            });
        } catch (error) {
            console.error('Lỗi controller lấy chi tiết vật tư tiêu hao:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    },

    them: async (req, res) => {
        try {
            const {
                id_benh_nhan,
                id_tu_thuoc,
                ten_vat_tu,
                so_luong,
                don_vi_tinh,
                ly_do,
                trang_thai
            } = req.body;

            if (!id_benh_nhan || isNaN(id_benh_nhan)) {
                return loi(res, 400, 'Vui lòng chọn người cao tuổi');
            }

            // Lấy từ tủ thuốc thì chỉ cần id_tu_thuoc, tên và đơn vị tính
            // sẽ được model điền theo dữ liệu trong kho.
            if (!id_tu_thuoc && !ten_vat_tu) {
                return loi(res, 400, 'Vui lòng chọn vật tư trong tủ thuốc hoặc nhập tên vật tư');
            }

            if (id_tu_thuoc && isNaN(id_tu_thuoc)) {
                return loi(res, 400, 'ID thuốc trong tủ thuốc không hợp lệ');
            }

            const soLuong = parseInt(so_luong);
            if (!soLuong || isNaN(soLuong) || soLuong <= 0) {
                return loi(res, 400, 'Số lượng phải lớn hơn 0');
            }

            if (trang_thai && !TRANG_THAI_TAO_MOI.includes(trang_thai)) {
                return loi(
                    res, 400,
                    'Trạng thái không hợp lệ khi tạo mới. ' +
                    `Chỉ nhận: ${TRANG_THAI_TAO_MOI.join(', ')}`
                );
            }

            const newId = await VatTuTieuHaoModel.them({
                id_benh_nhan: parseInt(id_benh_nhan),
                id_nguoi_gui: req.user?.id_nhan_vien || null,
                id_tu_thuoc: id_tu_thuoc ? parseInt(id_tu_thuoc) : null,
                ten_vat_tu: ten_vat_tu ? String(ten_vat_tu).trim() : null,
                so_luong: soLuong,
                don_vi_tinh: don_vi_tinh ? String(don_vi_tinh).trim() : null,
                ly_do: ly_do ? String(ly_do).trim() : null,
                // Tồn kho trừ ngay lúc tạo nên mặc định coi như đã sử dụng
                trang_thai: trang_thai || 'da_su_dung'
            });

            return res.status(201).json({
                success: true,
                message: 'Thêm vật tư tiêu hao thành công',
                id: newId
            });
        } catch (error) {
            console.error('Lỗi controller thêm vật tư tiêu hao:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    },

    xoa: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID bản ghi không hợp lệ');
            }

            await VatTuTieuHaoModel.xoa(parseInt(id));

            return res.status(200).json({
                success: true,
                message: 'Xóa bản ghi thành công, tồn kho đã được hoàn lại nếu có'
            });
        } catch (error) {
            console.error('Lỗi controller xóa vật tư tiêu hao:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    },

    doiTrangThai: async (req, res) => {
        try {
            const { id } = req.params;
            const { trang_thai } = req.body;

            if (!id || isNaN(id)) {
                return loi(res, 400, 'ID bản ghi không hợp lệ');
            }

            if (!trang_thai || !TRANG_THAI_HOP_LE.includes(trang_thai)) {
                return loi(res, 400, 'Trạng thái không hợp lệ');
            }

            const daDoi = await VatTuTieuHaoModel.doiTrangThai(parseInt(id), trang_thai);

            return res.status(200).json({
                success: true,
                message: daDoi ? 'Cập nhật trạng thái thành công' : 'Bản ghi đã ở trạng thái này'
            });
        } catch (error) {
            console.error('Lỗi controller đổi trạng thái vật tư tiêu hao:', error);
            return loi(res, error.status || 500,
                error.status ? error.message : 'Lỗi server: ' + error.message);
        }
    }
};

module.exports = vatTuTieuHaoController;
