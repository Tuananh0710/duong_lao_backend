// controllers/tuThuocController.js
const TuThuocModel = require('../models/tuThuoc');

const TRANG_THAI_HOP_LE = ['con_hang', 'sap_het', 'het_hang', 'het_han'];

const tuThuocController = {
    getDsPhanLoai: async (req, res) => {
        try {
            const danhSach = await TuThuocModel.getDsPhanLoai();

            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách phân loại thuốc thành công',
                tong_so: danhSach.length,
                data: danhSach
            });
        } catch (error) {
            console.error('Lỗi controller lấy phân loại thuốc:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    getDsThuoc: async (req, res) => {
        try {
            const { search = '', id_phan_loai, trang_thai } = req.query;

            const page = Math.max(parseInt(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);

            if (id_phan_loai && isNaN(id_phan_loai)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID phân loại không hợp lệ'
                });
            }

            if (trang_thai && !TRANG_THAI_HOP_LE.includes(trang_thai)) {
                return res.status(400).json({
                    success: false,
                    message: 'Trạng thái không hợp lệ'
                });
            }

            const dieuKien = {
                search: search.trim(),
                idPhanLoai: id_phan_loai ? parseInt(id_phan_loai) : null,
                trangThai: trang_thai || null
            };

            const [danhSach, tongSo] = await Promise.all([
                TuThuocModel.getDsThuoc({ ...dieuKien, page, limit }),
                TuThuocModel.demDsThuoc(dieuKien)
            ]);

            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách tủ thuốc thành công',
                data: danhSach,
                phan_trang: {
                    trang_hien_tai: page,
                    so_dong: limit,
                    tong_so: tongSo,
                    tong_trang: Math.ceil(tongSo / limit)
                }
            });
        } catch (error) {
            console.error('Lỗi controller lấy danh sách tủ thuốc:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    thongKe: async (req, res) => {
        try {
            const thongKe = await TuThuocModel.thongKe();

            return res.status(200).json({
                success: true,
                message: 'Lấy thống kê tủ thuốc thành công',
                data: thongKe
            });
        } catch (error) {
            console.error('Lỗi controller thống kê tủ thuốc:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    getChiTiet: async (req, res) => {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID thuốc không hợp lệ'
                });
            }

            const thuoc = await TuThuocModel.getChiTiet(parseInt(id));

            if (!thuoc) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thuốc trong tủ thuốc'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Lấy chi tiết thuốc thành công',
                data: thuoc
            });
        } catch (error) {
            console.error('Lỗi controller lấy chi tiết thuốc:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    }
};

module.exports = tuThuocController;
