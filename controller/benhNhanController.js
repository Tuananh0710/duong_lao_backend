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

            const result = await BenhNhan.getDsBenhNhan(
                page,
                limit,
                search,
                idDieuDuongNum
            );

            // Page vượt quá totalPages → reset về page 1
            if (
                result.pagination.total > 0 &&
                result.data.length === 0 &&
                page > result.pagination.totalPages
            ) {
                const newResult = await BenhNhan.getDsBenhNhan(
                    1,
                    limit,
                    search,
                    idDieuDuongNum
                );

                return res.json({
                    success: true,
                    message: `Danh sách bệnh nhân (${newResult.data.length} bản ghi)`,
                    benh_nhan: newResult.data,
                    page: newResult.pagination.page,
                    limit: newResult.pagination.limit,
                    total: newResult.pagination.total,
                    totalPages: newResult.pagination.totalPages
                });
            }

            // ✅ TRƯỜNG HỢP BÌNH THƯỜNG
            return res.json({
                success: true,
                message: result.data.length > 0
                    ? `Danh sách bệnh nhân (${result.data.length} bản ghi)`
                    : 'Không tìm thấy bệnh nhân nào',
                benh_nhan: result.data,
                page: result.pagination.page,
                limit: result.pagination.limit,
                total: result.pagination.total,
                totalPages: result.pagination.totalPages
            });

        } catch (error) {
            console.error('Error in controller getDsBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy danh sách bệnh nhân'
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