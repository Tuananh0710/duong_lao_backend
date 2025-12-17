const DuongHuyetModel = require('../models/duongHuyet');

class DuongHuyetController {

    static async create(req, res) {
        try {
            const { 
                id_benh_nhan, 
                gia_tri_duong_huyet,
                vi_tri_lay_mau,
                trieu_chung_kem_theo,
                thoi_gian_do
            } = req.body;
            
            // Validate dữ liệu đầu vào
            if (!id_benh_nhan || gia_tri_duong_huyet === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ thông tin: id_benh_nhan, gia_tri_duong_huyet'
                });
            }

            // Kiểm tra giá trị đường huyết hợp lệ
            if (gia_tri_duong_huyet < 1.0 || gia_tri_duong_huyet > 33.3) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị đường huyết không hợp lệ (70.0 - 180.0 mg/dL)'
                });
            }

            // Xác định thời điểm đo (dựa vào giờ hiện tại và triệu chứng)
            let measurementTime = 'khac';
            const currentHour = new Date().getHours();
            const symptoms = trieu_chung_kem_theo ? trieu_chung_kem_theo.toLowerCase() : '';
            
            if (symptoms.includes('doi') || symptoms.includes('đói')) {
                measurementTime = 'truoc_an';
            } else if (symptoms.includes('an') || symptoms.includes('ăn')) {
                measurementTime = 'sau_an';
            } else if (currentHour >= 5 && currentHour < 10) {
                measurementTime = 'sang';
            } else if (currentHour >= 10 && currentHour < 14) {
                measurementTime = 'trua';
            } else if (currentHour >= 14 && currentHour < 18) {
                measurementTime = 'chieu';
            } else {
                measurementTime = 'toi';
            }

            // Tự động đánh giá đường huyết
            const evaluation = DuongHuyetModel.evaluateBloodSugar(gia_tri_duong_huyet, measurementTime);
            
            const data = {
                ...req.body,
                ...evaluation,
                thoi_gian_do: req.body.thoi_gian_do || new Date(),
                vi_tri_lay_mau: vi_tri_lay_mau || 'ngon_tay'
            };

            const result = await DuongHuyetModel.create(data);
            
            res.status(201).json({
                success: true,
                message: result.message,
                // duong_huyet: result.data,
                // measurement_time: measurementTime
            });
        } catch (error) {
            console.error('Lỗi trong controller create:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }


    static async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await DuongHuyetModel.findById(id);
            
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu đường huyết'
                });
            }
            
            res.status(200).json({
                success: true,
                duong_huyet: data
            });
        } catch (error) {
            console.error('Lỗi trong controller getById:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }

    static async getByBenhNhan(req, res) {
        try {
            const { idBenhNhan } = req.params;
            const filters = req.query;
            
            const data = await DuongHuyetModel.findByBenhNhan(idBenhNhan, filters);
            
            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu đường huyết cho bệnh nhân này'
                });
            }
            
            res.status(200).json({
                success: true,
                duong_huyet: data,
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
    }

    static async getLatestByBenhNhan(req, res) {
        try {
            const { idBenhNhan } = req.params;
            const data = await DuongHuyetModel.findLatestByBenhNhan(idBenhNhan);
            
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy dữ liệu đường huyết'
                });
            }
            
            res.status(200).json({
                success: true,
                duong_huyet: data
            });
        } catch (error) {
            console.error('Lỗi trong controller getLatestByBenhNhan:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }

    
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            // Nếu có thay đổi giá trị đường huyết, tự động đánh giá lại
            if (updateData.gia_tri_duong_huyet !== undefined) {
                const currentData = await DuongHuyetModel.findById(id);
                if (currentData) {
                    const glucose = updateData.gia_tri_duong_huyet;
                    // Giả sử đo trước ăn nếu không có thông tin
                    const measurementTime = 'truoc_an';
                    const evaluation = DuongHuyetModel.evaluateBloodSugar(glucose, measurementTime);
                    updateData.danh_gia = evaluation.danh_gia;
                    updateData.muc_do = evaluation.muc_do;
                    updateData.noi_dung_canh_bao = evaluation.noi_dung_canh_bao;
                }
            }
            
            const result = await DuongHuyetModel.update(id, updateData);
            
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

    /**
     * Xóa dữ liệu đường huyết
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await DuongHuyetModel.delete(id);
            
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
   
    static async evaluate(req, res) {
        try {
            const { 
                gia_tri_duong_huyet, 
                unit = 'mmol/l',
                measurement_time = 'truoc_an'
            } = req.body;
            
            if (gia_tri_duong_huyet === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp gia_tri_duong_huyet'
                });
            }

            let glucoseValue = gia_tri_duong_huyet;
            
            // Chuyển đổi đơn vị nếu cần
            if (unit.toLowerCase() === 'mg/dl') {
                // mg/dL to mmol/L
                glucoseValue = DuongHuyetModel.convertGlucoseUnit(glucoseValue, 'mg/dl', 'mmol/l');
            }
            
            const evaluation = DuongHuyetModel.evaluateBloodSugar(glucoseValue, measurement_time);
            
            // Thêm thông tin chuyển đổi
            const conversions = {
                mmol_l: glucoseValue.toFixed(1),
                mg_dl: DuongHuyetModel.convertGlucoseUnit(glucoseValue, 'mmol/l', 'mg/dl').toFixed(0)
            };
            
            res.status(200).json({
                success: true,
                data: {
                    ...evaluation,
                    conversions,
                    measurement_time: measurement_time
                }
            });
        } catch (error) {
            console.error('Lỗi trong controller evaluate:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }

}

module.exports = DuongHuyetController;