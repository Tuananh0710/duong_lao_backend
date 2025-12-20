const benhNhan = require('../models/BenhNhan');
const congViec = require('../models/congViec');
const thongBao = require('../models/ThongBao');
const lichThamBenh = require('../models/lichThamBenh');

class dashBoard {
    static async getAll(req, res) {
        try {
            // Lấy id_nhan_vien từ req.user (token payload)
            const idNhanVien = req.user?.id_nhan_vien;
            const idTaiKhoan = req.user?.id_tai_khoan;
            
            if (!idNhanVien) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy thông tin nhân viên. Token không hợp lệ.'
                });
            }
            
            // Đổi tên biến để phù hợp với tên hàm model (nếu cần)
            const idDieuDuong = idNhanVien;
            
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
                congViec.getCongViecByDieuDuong(parseInt(idTaiKhoan)).catch(err => {
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
                ...tong_so_cong_viec || 0,
                tong_so_lich: tong_so_lich || 0,
                tong_so_thong_bao: tong_so_thong_bao || 0,
                id_nhan_vien: parseInt(idNhanVien),
                id_tai_khoan: parseInt(idTaiKhoan)
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