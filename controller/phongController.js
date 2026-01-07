const Phong = require('../models/phong');
class phongController{
    static async getAll(req,res){
        try {
            
            const phong= await Phong.getAllPhong();
            if(phong.length===0){
                return res.status(401).json({
                    successL: false,
                    message:"ko tim thay phong"
                });
            }
            const phongArray = phong.map(item => item.ten_phong_day_du);
            return res.status(200).json({
                success:true,
                message:"lay ds phong thanh cong",
                phong:phongArray
            })
        } catch (error) {
             console.error('Lỗi trong controller getALL:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
}
module.exports=phongController