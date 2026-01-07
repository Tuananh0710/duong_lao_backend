const Phong = require('../models/phong');
class phongController{
    static async getAll(req,res){
        try {
            const {id_phan_khu}=req.params;
            if(!id_phan_khu){
                return res.status(401).json({
                    success:false,
                    message:"thieu id phan khu"
                })
            }
            const phong= await Phong.getAllPhong(id_phan_khu);
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