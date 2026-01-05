const ThongBao= require ('../models/ThongBao');

class thongBaoController{
    static async getThongBaoTheoLoai(req,res){
        try {
            const {loai} = req.params;
            const {page =1, limit=20}= req.query;
            const offset = (page -1)*limit;

            const thongBaos = await ThongBao.getByType(loai,limit,offset);
            const tong_so= await ThongBao.countByType(loai);
            const so_trang= Math.ceil(tong_so/limit);

            res.json({
                success : true,
                thong_bao: thongBaos,
            })
        } catch (error) {
            console.error('Error getting notifications by type:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy thông báo',
                error: error.message
            });
        }
    }
    static async getChiTietThongBao(req,res){
        try {
            const  {id} =req.params;
            const thongBao= await ThongBao.getById(id);
            if(!thongBao){
                return res.status(404).json({
                    success:false,
                    message: 'ko tim thay thong bao',
                });
            }
            res.json({
                success: true,
                ...thongBao
            })
        } catch (error) {
            console.error('Error getting notification detail:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy chi tiết thông báo',
                error: error.message
            });
        }
    }
    static async getSoThongBaoTheoLoai(req,res){
        try {
            const {loai}= req.params;
            const tong_so= await ThongBao.countByType(loai);
            res.json({
                success:true,
                tong_so:tong_so
            });
        } catch (error) {
            console.error('Error :', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy số thông báo',
                error: error.message
            });
        }
    }
    static async getByUser(req, res) {
    try {
        const id_tai_khoan = req.user.id_tai_khoan;
        const limit = req.query.limit || 20; 
        
        const notifications = await ThongBao.getByUser(id_tai_khoan, limit);
        
        return res.status(200).json({
            success: true,
            notifications: notifications, 
            count: notifications.length
        });
    } catch (error) {
        console.error('Error getting user notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông báo của người dùng',
            error: error.message
        });
    }
}
}
module.exports= thongBaoController;