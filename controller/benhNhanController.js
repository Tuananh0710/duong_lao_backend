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
        
        if (limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Giới hạn phải từ 1 đến 100 bản ghi'
            });
        }
        
        console.log('Controller params:', { 
            idDieuDuong: idDieuDuongNum, 
            page, 
            limit, 
            search 
        });
        
        // Gọi model
        const result = await BenhNhan.getDsBenhNhan(page, limit, search, idDieuDuongNum);
        
        // Debug để xem kết quả từ model
        console.log('Result from model:', result);
        
        // Lấy danh sách bệnh nhân
        const data = result.data || [];

        const total = result.total || 0;
        const totalPages = Math.ceil(total / limit);
        
        if (result.total > 0 && data.length === 0 && page > Math.ceil(result.total / limit)) {
            console.log('Page vượt quá totalPages, gọi lại với page = 1');
            const newResult = await BenhNhan.getDsBenhNhan(1, limit, search, idDieuDuongNum);
            
            return res.json({
                success: true,
                message: `Danh sách bệnh nhân (${newResult.data?.length || 0} bản ghi)`,
                benh_nhan: newResult.data || [],
                id_dieu_duong: idDieuDuongNum
            });
        }
        
        res.json({
            success: true,
            message: data.length > 0 
                ? `Danh sách bệnh nhân (${data.length} bản ghi)` 
                : 'Không tìm thấy bệnh nhân nào',
            benh_nhan: data,
            id_dieu_duong: idDieuDuongNum,
            total:total,
            page:page,
            limit:limit,
            totalPage:totalPages
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
    static async getDsBenhNhanByNguoiNha(req, res) {
        try {
            // Lấy id từ req.user (đã được xác thực qua middleware)
            const idTaiKhoanNguoiNha = req.user.id;
            const vaiTro = req.user.vai_tro;

            // Chỉ cho phép người nhà
            if (vaiTro !== 'nguoi_nha') {
                return res.status(403).json({
                    success: false,
                    message: 'Chỉ người nhà mới có quyền truy cập'
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            
            if (page < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Số trang phải lớn hơn 0'
                });
            }
            
            if (limit < 1 || limit > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Giới hạn phải từ 1 đến 100 bản ghi'
                });
            }
            
            console.log('NguoiNha Controller params:', { 
                idTaiKhoanNguoiNha, 
                page, 
                limit, 
                search 
            });
            
            // Gọi model
            const result = await BenhNhan.getDsBenhNhanByNguoiNha(idTaiKhoanNguoiNha, page, limit, search);
            
            // Lấy danh sách bệnh nhân
            const data = result.data || [];

            const total = result.total || 0;
            const totalPages = Math.ceil(total / limit);
            
            res.json({
                success: true,
                message: data.length > 0 
                    ? `Danh sách bệnh nhân (${data.length} bản ghi)` 
                    : 'Không tìm thấy bệnh nhân nào',
                benh_nhan: data,
                id_tai_khoan: idTaiKhoanNguoiNha,
                total: total,
                page: page,
                limit: limit,
                totalPage: totalPages
            });
            
        } catch (error) {
            console.error('Error in controller getDsBenhNhanByNguoiNha:', error);
            
            if (error.message === 'Thiếu tham số idTaiKhoanNguoiNha') {
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
}

module.exports = BenhNhanController;