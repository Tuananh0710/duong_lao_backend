const suKien=require('../models/suKien');
class suKienController{
    static async getDsSuKien(req,res){
        try {
            const DsSuKien= await suKien.getDsSuKien();
            if(!DsSuKien || DsSuKien.length ===0){
                return res.status(200).json({
                    success: true,
                    message: 'Không có sự kiện nào',
                    tong_so: 0,
                    danh_sach: []
                })
            }
            return res.status(200).json({
                success: true,
                message: 'Lấy danh sách sự kiện thành công',
                tong_so: DsSuKien.length,
                danh_sach: DsSuKien
            })
        } catch (error) {
            console.error('Lỗi controller lấy sk:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi hệ thống'
            });
        }
    }
}
module.exports=suKienController;