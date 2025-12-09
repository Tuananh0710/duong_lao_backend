const nhietDo=require('../models/nhietdo');
class nhietDoController{
    static async create(req,res){
        try {
            const {
                id_benh_nhan, 
                gia_tri_nhiet_do,
                vi_tri_do,
                tinh_trang_luc_do,
                thoi_gian_do
            }= req.body;
            if (!id_benh_nhan || gia_tri_nhiet_do === undefined|| !vi_tri_do || !tinh_trang_luc_do) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin'
                });
            }
            if (gia_tri_nhiet_do < 20 || gia_tri_nhiet_do > 45) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị nhiệt độ không hợp lệ (20°C - 45°C)'
                });
            }
            const evaluation= await nhietDo.evaluateTemperature(gia_tri_nhiet_do);
            const data={
                ...req.body,
                ...evaluation,
                thoi_gian_do: req.body.thoi_gian_do|| new Date(),
                vi_tri_do:vi_tri_do || 'nach',
                tinh_trang_luc_do:tinh_trang_luc_do || 'nghi_ngoi'
            };

            const result=await nhietDo.create(data);
            res.status(201).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Lỗi trong controller create:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    };
    static async getByBenhNhan(req,res){
        try {
            const {idBenhNhan}=req.params;
            const filters= req.query;
            const data= await nhietDo.findByBenhNhan(idBenhNhan,filters);
            if(data.length===0){
                 return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu nhiệt độ cho bệnh nhân này'
                });
            }
             res.status(200).json({
                success: true,
                data: data,
                total: data.length
            });
        } catch (error) {
            console.error('Lỗi trong controller getByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    };
    static async getLastestByBenhNhan(req,res){
        try {
            const {idBenhNhan}= req.params;
        const data =await nhietDo.findLatestByBenhNhan(idBenhNhan);
        if(!data){
            return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu nhiệt độ'
                });
        }
            res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Lỗi trong controller getLatestByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    };
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            if (updateData.gia_tri_nhiet_do !== undefined) {
                const currentData = await nhietDo.findById(id);
                if (currentData) {
                    const temp = updateData.gia_tri_nhiet_do;
                    const evaluation = nhietDo.evaluateTemperature(temp);
                    updateData.danh_gia = evaluation.danh_gia;
                    updateData.muc_do = evaluation.muc_do;
                    updateData.noi_dung_canh_bao = evaluation.noi_dung_canh_bao;
                }
            }
            
            const result = await nhietDo.update(id, updateData);
            
            if (!result.success) {
                return res.status(404).json(result);
            }
            
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong controller update:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await nhietDo.delete(id);
            
            if (!result.success) {
                return res.status(404).json(result);
            }
            
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong controller delete:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
}
module.exports=nhietDoController;