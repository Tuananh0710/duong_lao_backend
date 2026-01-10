// controllers/doDungCaNhanController.js
const DoDungCaNhanModel = require('../models/doDungCaNhan');

const doDungCaNhanController = {
    getDsByBenhNhan: async (req, res) => {
        try {
            const { idBenhNhan } = req.params;
            
            if (!idBenhNhan) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp ID bệnh nhân'
                });
            }
            
            if (isNaN(idBenhNhan)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bệnh nhân không hợp lệ'
                });
            }
            
            const danhSach = await DoDungCaNhanModel.getDsByBenhNhan(parseInt(idBenhNhan));
            
            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách đồ dùng thành công',
                tong_so: danhSach.length,
                danh_sach: danhSach
            });
            
        } catch (error) {
            console.error('Lỗi controller lấy danh sách đồ dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    themDoDung: async (req, res) => {
        try {
            const { 
                id_benh_nhan, 
                ten_vat_dung, 
                so_luong = 1,
                tinh_trang = 'tot',
                ghi_chu 
            } = req.body;
            
            // Validation
            if (!id_benh_nhan || !ten_vat_dung) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
                });
            }
            
            if (so_luong <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Số lượng phải lớn hơn 0'
                });
            }
            
            const data = {
                id_benh_nhan,
                ten_vat_dung,
                so_luong: parseInt(so_luong),
                tinh_trang: ['tot', 'hu_hong', 'mat'].includes(tinh_trang) ? tinh_trang : 'tot',
                ghi_chu
            };
            
            const newId = await DoDungCaNhanModel.themDoDung(data);
            
            
            return res.status(201).json({
                success: true,
                message: 'Thêm đồ dùng thành công',
            });
            
        } catch (error) {
            console.error('Lỗi controller thêm đồ dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    capNhatDoDung: async (req, res) => {
        try {
            const { id } = req.params;
            const data = req.body;
            
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID đồ dùng không hợp lệ'
                });
            }
            
            const success = await DoDungCaNhanModel.capNhatDoDung(parseInt(id), data);
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đồ dùng để cập nhật'
                });
            }
            
            
            return res.status(200).json({
                success: true,
                message: 'Cập nhật đồ dùng thành công', 
            });
            
        } catch (error) {
            console.error('Lỗi controller cập nhật đồ dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    xoaDoDung: async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID đồ dùng không hợp lệ'
                });
            }
            
            const success = await DoDungCaNhanModel.xoaDoDung(parseInt(id));
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đồ dùng để xóa'
                });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Xóa đồ dùng thành công'
            });
            
        } catch (error) {
            console.error('Lỗi controller xóa đồ dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    timKiemDoDung: async (req, res) => {
        try {
            const { idBenhNhan, tenVatDung } = req.query;
            
            if (!idBenhNhan || !tenVatDung) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp ID bệnh nhân và tên vật dụng'
                });
            }
            
            const ketQua = await DoDungCaNhanModel.timKiemDoDung(
                parseInt(idBenhNhan), 
                tenVatDung
            );
            
            return res.status(200).json({
                success: true,
                message: 'Tìm kiếm thành công',
                data: {
                    tong_ket_qua: ketQua.length,
                    ket_qua: ketQua
                }
            });
            
        } catch (error) {
            console.error('Lỗi controller tìm kiếm đồ dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },

    thongKeDoDung: async (req, res) => {
        try {
            const { idBenhNhan } = req.query;
            
            if (!idBenhNhan) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp ID bệnh nhân'
                });
            }
            
            const thongKe = await DoDungCaNhanModel.thongKeDoDung(parseInt(idBenhNhan));
            
            return res.status(200).json({
                success: true,
                message: 'Thống kê thành công',
                data: thongKe
            });
            
        } catch (error) {
            console.error('Lỗi controller thống kê đồ dùng:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    },
     getDsLoaiDoDung: async (req, res) => {
        try {
            const getDsLoaiDoDung = await DoDungCaNhanModel.getDsLoaiDoDung();
            
            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách loại sự kiện thành công',
                danh_sach: getDsLoaiDoDung 
            });

        } catch (error) {
            console.error('Lỗi controller lấy loại sự kiện:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi hệ thống',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

module.exports = doDungCaNhanController;