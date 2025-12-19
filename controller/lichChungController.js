const lichChung = require('../models/lichChung');

class lichChungController {
    static async getLichChung(req, res) {
        try {
            const { id_benh_nhan } = req.params;
            
            if (!id_benh_nhan) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu ID bệnh nhân'
                });
            }

            const danhSach = await lichChung.getLichChung(id_benh_nhan);

            return res.status(200).json({
                success: true,
                message: danhSach.length > 0 
                    ? 'Lấy lịch chung thành công' 
                    : 'Không có sự kiện hoặc lịch khám nào',
                tong_so: danhSach.length,
                danh_sach: danhSach
            });

        } catch (error) {
            console.error('Lỗi controller lấy lịch chung:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi hệ thống'
            });
        }
    }

    static async getLichChungPhanTrang(req, res) {
        try {
            const { id_benh_nhan } = req.params;
            const { page = 1, limit = 10 } = req.query;
            
            if (!id_benh_nhan) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu ID bệnh nhân'
                });
            }

            const result = await lichChung.getLichChungPhanTrang(
                id_benh_nhan, 
                parseInt(page), 
                parseInt(limit)
            );

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            console.error('Lỗi controller lấy lịch chung phân trang:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi hệ thống'
            });
        }
    }
}

module.exports = lichChungController;