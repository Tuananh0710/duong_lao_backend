const lichThamBenhModel = require('../models/lichThamBenh');  // ✅ Đổi tên biến

class lichThamBenhController {
    static async getThongKeLichThamBenhByDieuDuong(req, res) {
        try {
            const { idDieuDuong } = req.params;

            if (!idDieuDuong || isNaN(idDieuDuong)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID điều dưỡng không hợp lệ'
                });
            }

            const lichThamBenhData = await lichThamBenhModel.getThongKeLichThamBenhByDieuDuong(parseInt(idDieuDuong));

            return res.status(200).json({
                success: true,
                lich_tham_benh: lichThamBenhData,
            });
        } catch (error) {
            console.error('Lỗi trong getThongKeLichThamBenhByDieuDuong:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy lịch thăm bệnh'
            });
        }
    }

    static async getTongSoLichHen(req, res) {
        try {
            const { idDieuDuong } = req.params;


            if (!idDieuDuong || isNaN(idDieuDuong)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID điều dưỡng không hợp lệ'
                });
            }

            const tongSo = await lichThamBenhModel.getTongSoLichHen(parseInt(idDieuDuong));

            return res.status(200).json({
                success: true,
                ...tongSo,
            });
        } catch (error) {
            console.error('Lỗi trong getTongSoLichHen:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thống kê'
            });
        }
    }
    static async getLichThamBenhGanNhat(req, res) {
        try {
            // Lấy id từ param
            const { id_benh_nhan, id_nguoi_than } = req.params;

            // Kiểm tra tham số
            if (!id_benh_nhan || !id_nguoi_than) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp id_benh_nhan và id_nguoi_than trong URL'
                });
            }

            // Kiểm tra định dạng ID
            if (isNaN(id_benh_nhan) || isNaN(id_nguoi_than)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID không hợp lệ, phải là số'
                });
            }

            // Chuyển đổi sang số nguyên
            const benhNhanId = parseInt(id_benh_nhan);
            const nguoiThanId = parseInt(id_nguoi_than);

            // Gọi hàm model
            const lichGanNhat = await lichThamBenhModel.getLichLastestByNguoiThanBenhNhan(
                nguoiThanId,
                benhNhanId
            );

            if (!lichGanNhat) {
                return res.status(200).json({
                    success: true,
                    message: 'Không tìm thấy lịch hẹn nào đã được duyệt',
                    data: null
                });
            }

            // Định dạng dữ liệu trả về
            const formattedData = {
                id_benh_nhan: lichGanNhat.id_benh_nhan,
                id_nguoi_than: lichGanNhat.id_nguoi_than,
                ngay_tham: lichGanNhat.ngay,
                khung_gio: lichGanNhat.khung_gio,
                loai : lichGanNhat.loai,
            };

            return res.status(200).json({
                success: true,
                message: 'Lấy lịch hẹn gần nhất thành công',
                ...formattedData
            });

        } catch (error) {
            console.error('Lỗi controller lịch thăm bệnh:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server: ' + error.message
            });
        }
    }

static async themLichThamMoiTheoBenhNhan(req, res) {
    try {
        const {
            id_benh_nhan,
            id_nguoi_than,
            ngay,
            khung_gio,
            loai,
            so_nguoi_di_cung,
            ghi_chu,
            trang_thai
        } = req.body;

        // 1. Validate bắt buộc
        if (!id_benh_nhan || !id_nguoi_than || !ngay || !khung_gio || !loai) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }

        // 2. Gọi model
        const result = await lichThamBenhModel.themLichThamMoi(
            id_nguoi_than,
            id_benh_nhan,
            ngay,
            khung_gio,
            loai,
            so_nguoi_di_cung || 0,
            ghi_chu || null,
            trang_thai || 'cho_duyet'
        );

        // 3. Kiểm tra kết quả
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.message
            });
        }

        // 4. Response thành công
        return res.status(201).json({
            success: true,
            message: 'Tạo lịch thăm thành công',
        });

    } catch (error) {
        console.error('Lỗi controller themLichThamMoiTheoBenhNhan:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
}


}

module.exports = lichThamBenhController;