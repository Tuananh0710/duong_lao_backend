const BenhNhan = require('../models/BenhNhan');

class BenhNhanController {

    static async getTongSoBenhNhan(req, res) {
        try {
            const { idDieuDuong } = req.params;

            if (!idDieuDuong) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu tham số idDieuDuong trong URL'
                });
            }

            const idDieuDuongNum = parseInt(idDieuDuong);
            if (isNaN(idDieuDuongNum)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID điều dưỡng phải là số'
                });
            }
            
            const tong_so = await BenhNhan.getTongSoBenhNhan(idDieuDuongNum);
            
            res.json({
                success: true,
                message: 'Lấy tổng số bệnh nhân thành công',
                tong_so_benh_nhan: tong_so,
                id_dieu_duong: idDieuDuongNum
            });
            
        } catch (error) {
            console.error('Error in getTongSoBenhNhan:', error);
            if (error.message === 'Thiếu tham số idDieuDuong') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getDsBenhNhan(req, res) {
        try {
            const { idDieuDuong } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            if (!idDieuDuong) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu tham số idDieuDuong trong URL'
                });
            }
            const idDieuDuongNum = parseInt(idDieuDuong);
            if (isNaN(idDieuDuongNum)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID điều dưỡng phải là số'
                });
            }
            if (page < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Số trang phải lớn hơn 0'
                });
            }
            
            if (limit < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Giới hạn phải lớn hơn 0'
                });
            }
            
            if (limit > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Giới hạn tối đa là 100 bản ghi'
                });
            }
            
            console.log('Controller params:', { 
                idDieuDuong: idDieuDuongNum, 
                page, 
                limit, 
                search 
            });
            
            const result = await BenhNhan.getDsBenhNhan(page, limit, search, idDieuDuongNum);
            if (result.pagination.total > 0 && result.data.length === 0 && page > result.pagination.totalPages) {
                console.log('Page vượt quá totalPages, gọi lại với page = 1');
                const newResult = await BenhNhan.getDsBenhNhan(1, limit, search, idDieuDuongNum);
                
                return res.json({
                    success: true,
                    message: `Danh sách bệnh nhân (${newResult.data.length} bản ghi)`,
                    benh_nhan: newResult.data,
                    pagination: newResult.pagination,
                    id_dieu_duong: idDieuDuongNum
                });
            }
            
            res.json({
                success: true,
                message: result.data.length > 0 
                    ? `Danh sách bệnh nhân (${result.data.length} bản ghi)` 
                    : 'Không tìm thấy bệnh nhân nào',
                benh_nhan: result.data,
                pagination: result.pagination,
                id_dieu_duong: idDieuDuongNum
            });
            
        } catch (error) {
            console.error('Error in controller getDsBenhNhan:', error);
            if (error.message === 'Thiếu tham số idDieuDuong') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy danh sách bệnh nhân',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getThongTinBenhNhan(req, res) {
        try {
            const { id } = req.params;
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID bệnh nhân không hợp lệ'
                });
            }
            
            const benhNhan = await BenhNhan.getThongTinChiTietBenhNhan(parseInt(id));
            if (!benhNhan) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy bệnh nhân'
                });
            }
            
            res.json({
                success: true,
                message: "Thông tin bệnh nhân",
                benh_nhan: benhNhan
            });
            
        } catch (error) {
            console.error('Error in getThongTinBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = BenhNhanController;