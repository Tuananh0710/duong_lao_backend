const TaiKhoan= require('../models/TaiKhoan')
class TaiKhoanController{
    static async getThongTinTaiKhoanByNguoiNha(req,res){
        try {
            const idTaiKhoan = req.user.id_tai_khoan;
            const result=await TaiKhoan.getThongTinTaiKhoanByNguoiThan(idTaiKhoan);
            return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            ...result
        }
        )
        } catch (error) {
            console.error('Error in controller getThongTinTaiKhoanByNguoiThan:', error);
             res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông tin tk',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    static async updateTaiKhoan(req, res) {
    try {
        const id =  req.user.id_tai_khoan;
        const updateData = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp dữ liệu cần cập nhật'
            });
        }

        const result = await TaiKhoan.updateTaiKhoan(id, updateData);
        
        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });

    } catch (error) {
        console.error('Error in controller updateTaiKhoan:', error);
        
        // Phân loại lỗi để trả về status code phù hợp
        if (error.message.includes('không hợp lệ') || 
            error.message.includes('đã được sử dụng') || 
            error.message.includes('Không có dữ liệu') ||
            error.message.includes('Không có dữ liệu hợp lệ')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('Không tìm thấy')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        // Xử lý lỗi MySQL
        if (error.code && error.code.startsWith('ER_')) {
            return res.status(409).json({
                success: false,
                message: 'Lỗi cơ sở dữ liệu',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật tài khoản',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
}
module.exports=TaiKhoanController;