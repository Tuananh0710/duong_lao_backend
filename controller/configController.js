const ConfigService = require('../services/configService');

class ConfigController {
    
    // API lấy cấu hình theo ID
    static async getConfigById(req, res) {
        try {
            const { configId } = req.params;
            
            if (!configId) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp configId'
                });
            }
            
            const configData = await ConfigService.getConfigById(configId);
            
            res.status(200).json({
                success: true,
                ...configData
            });
            
        } catch (error) {
            console.error('❌ Lỗi trong controller getConfigById:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    
    // API lấy cấu hình theo tên chỉ số
    static async getConfigByName(req, res) {
        try {
            const { tenChiSo } = req.params;
            
            if (!tenChiSo) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp tên chỉ số'
                });
            }
            
            const configData = await ConfigService.getConfigByName(tenChiSo);
            
            res.status(200).json({
            success: true,
            ...configData
            });
            
        } catch (error) {
            console.error('❌ Lỗi trong controller getConfigByName:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    
    // API lấy tất cả cấu hình
    static async getAllConfigs(req, res) {
        try {
            const configData = await ConfigService.getAllConfigs();
            
            res.status(200).json({
                success: true,
                ...configData
            });
            
        } catch (error) {
            console.error('❌ Lỗi trong controller getAllConfigs:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    
    // API đánh giá giá trị với cấu hình
    static async evaluateValue(req, res) {
        try {
            const { tenChiSo, giaTri, configId } = req.body;
            
            if ((!tenChiSo && !configId) || giaTri === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp tenChiSo (hoặc configId) và giaTri'
                });
            }
            
            const value = parseFloat(giaTri);
            if (isNaN(value)) {
                return res.status(400).json({
                    success: false,
                    message: 'Giá trị không hợp lệ'
                });
            }
            
            // Lấy cấu hình
            let configData;
            if (configId) {
                configData = await ConfigService.getConfigById(configId);
            } else {
                configData = await ConfigService.getConfigByName(tenChiSo);
            }
            
            // Đánh giá giá trị
            const evaluation = ConfigService.evaluateValue(value, configData.configLimits);
            
            // Tìm mô tả chi tiết
            let evaluationDetail = null;
            let evaluationMessage = '';
            
            switch (evaluation) {
                case 'nguy_hiem':
                    evaluationDetail = configData.configLimits.nguy_hiem;
                    evaluationMessage = evaluationDetail?.message || 'Mức nguy hiểm! Cần can thiệp ngay.';
                    break;
                case 'bat_on':
                    evaluationDetail = configData.configLimits.bat_on;
                    evaluationMessage = 'Mức bất ổn! Cần theo dõi.';
                    break;
                case 'cao':
                    evaluationDetail = configData.configLimits.cao;
                    evaluationMessage = 'Mức cao! Cần lưu ý.';
                    break;
                case 'thap':
                    evaluationDetail = configData.configLimits.thap;
                    evaluationMessage = 'Mức thấp! Cần lưu ý.';
                    break;
                case 'ha':
                    evaluationDetail = configData.configLimits.ha;
                    evaluationMessage = 'Huyết áp thấp! Cần lưu ý.';
                    break;
                case 'binh_thuong':
                    evaluationDetail = configData.configLimits.binh_thuong;
                    evaluationMessage = 'Mức bình thường.';
                    break;
                default:
                    evaluationDetail = { description: 'Ngoài phạm vi đánh giá' };
                    evaluationMessage = 'Giá trị ngoài phạm vi đánh giá.';
            }
            
            res.status(200).json({
                success: true,
                data: {
                    ten_chi_so: configData.configInfo.name,
                    gia_tri: value,
                    danh_gia: evaluation,
                    chi_tiet_danh_gia: evaluationDetail,
                    thong_bao: evaluationMessage,
                    cau_hinh_su_dung: configData.configInfo,
                    thoi_gian: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Lỗi trong controller evaluateValue:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    
    // API tạo cấu hình mới
    static async createConfig(req, res) {
        try {
            const { ten_chi_so, gioi_han_canh_bao } = req.body;
            
            const result = await ConfigService.createConfig({
                ten_chi_so,
                gioi_han_canh_bao
            });
            
            res.status(201).json(result);
            
        } catch (error) {
            console.error('❌ Lỗi trong controller createConfig:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
    
    // API cập nhật cấu hình
    static async updateConfig(req, res) {
        try {
            const { configId } = req.params;
            const updateData = req.body;
            
            if (!configId) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp configId'
                });
            }
            
            const result = await ConfigService.updateConfig(configId, updateData);
            
            res.status(200).json(result);
            
        } catch (error) {
            console.error('❌ Lỗi trong controller updateConfig:', error);
            const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // API xóa cấu hình
    static async deleteConfig(req, res) {
        try {
            const { configId } = req.params;
            
            if (!configId) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp configId'
                });
            }
            
            const result = await ConfigService.deleteConfig(configId);
            
            res.status(200).json(result);
            
        } catch (error) {
            console.error('❌ Lỗi trong controller deleteConfig:', error);
            const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // API lấy các loại chỉ số phổ biến
    static async getCommonHealthIndicators(req, res) {
        try {
            const commonIndicators = [
                {
                    id: 'duong_huyet',
                    name: 'Đường huyết',
                    display_name: 'Đường huyết',
                    unit: 'mmol/L',
                    search_terms: ['đường huyết', 'duong huyet', 'glucose']
                },
                {
                    id: 'huyet_ap',
                    name: 'Huyết áp',
                    display_name: 'Huyết áp',
                    unit: 'mmHg',
                    search_terms: ['huyết áp', 'huyet ap', 'blood pressure']
                },
                {
                    id: 'nhip_tim',
                    name: 'Nhịp tim',
                    display_name: 'Nhịp tim',
                    unit: 'bpm',
                    search_terms: ['nhịp tim', 'nhip tim', 'heart rate']
                },
                {
                    id: 'sp02',
                    name: 'SpO2',
                    display_name: 'SpO2',
                    unit: '%',
                    search_terms: ['spo2', 'sp02', 'oxy']
                },
                {
                    id: 'nhiet_do',
                    name: 'Nhiệt độ',
                    display_name: 'Nhiệt độ',
                    unit: '°C',
                    search_terms: ['nhiệt độ', 'nhiet do', 'temperature']
                }
            ];
            
            res.status(200).json({
                success: true,
                data: commonIndicators,
                total: commonIndicators.length
            });
            
        } catch (error) {
            console.error('❌ Lỗi trong controller getCommonHealthIndicators:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
}

module.exports = ConfigController;