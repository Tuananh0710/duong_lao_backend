const benhNhan = require('../models/BenhNhan');
const congViec = require('../models/congViec');
const thongBao = require('../models/ThongBao');
const lichThamBenh = require('../models/lichThamBenh');

class dashBoard {
    static async getAll(req, res) {
        try {
            // Lấy idDieuDuong từ req.user thay vì req.params
            const idDieuDuong = req.user?.id;
            
            if (!idDieuDuong || isNaN(idDieuDuong)) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy thông tin điều dưỡng hoặc ID không hợp lệ'
                });
            }
            
            const [
                tong_so_benh_nhan,
                tong_so_cong_viec,
                tong_so_thong_bao,
                tong_so_lich
            ] = await Promise.all([
                benhNhan.getTongSoBenhNhan(parseInt(idDieuDuong)).catch(err => {
                    console.error('Lỗi khi lấy tổng số bệnh nhân:', err);
                    return 0;
                }),
                congViec.getCongViecByDieuDuong(parseInt(idDieuDuong)).catch(err => {
                    console.error('Lỗi khi lấy tổng số công việc:', err);
                    return 0;
                }),
                thongBao.countByType('canh_bao').catch(err => {
                    console.error('Lỗi khi đếm thông báo:', err);
                    return 0;
                }),
                lichThamBenh.getTongSoLichHen(parseInt(idDieuDuong)).catch(err => {
                    console.error('Lỗi khi lấy tổng số lịch hẹn:', err);
                    return 0;
                })
            ]);
            
            return res.status(200).json({
                success: true,
                message: 'Lấy dữ liệu dashboard thành công',
                tong_so_benh_nhan: tong_so_benh_nhan || 0,
                tong_so_cong_viec: tong_so_cong_viec || 0,
                tong_so_lich: tong_so_lich || 0,
                tong_so_thong_bao: tong_so_thong_bao || 0,
                id_dieu_duong: parseInt(idDieuDuong),
            });
            
        } catch (error) {
            console.error('Lỗi trong getAll dashboard:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi hệ thống',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = dashBoard;