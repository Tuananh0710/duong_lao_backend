const db = require('../config/database');

class ConfigService {
    
    // Lấy cấu hình theo ID
    static async getConfigById(configId) {
        try {
            console.log(`🔍 Đang lấy cấu hình từ database với ID: ${configId}`);
            
            if (!configId) {
                console.log('ℹ️ Không có ID cấu hình được cung cấp');
                return this.getDefaultConfig();
            }
            
            const [configRows] = await db.execute(
                'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE id = ?',
                [configId]
            );
            
            if (configRows.length === 0) {
                console.log(`❌ Không tìm thấy cấu hình với ID: ${configId}`);
                return this.getDefaultConfig();
            }
            
            const config = configRows[0];
            console.log(`✅ Tìm thấy cấu hình: ${config.ten_chi_so}`);
            
            return this.parseConfigData(config);
            
        } catch (dbError) {
            console.error('❌ Lỗi truy vấn database:', dbError);
            return this.getDefaultConfig();
        }
    }
    
    static async getConfigByName(tenChiSo) {
        try {
            console.log(`🔍 Đang lấy cấu hình cho chỉ số: ${tenChiSo}`);
            
            const [configRows] = await db.execute(
                'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so LIKE ? ORDER BY ngay_cap_nhat DESC LIMIT 1',
                [`%${tenChiSo}%`]
            );
            
            if (configRows.length === 0) {
                console.log(`❌ Không tìm thấy cấu hình cho: ${tenChiSo}`);
                return this.getDefaultConfigByName(tenChiSo);
            }
            
            const config = configRows[0];
            console.log(`✅ Tìm thấy cấu hình: ${config.ten_chi_so}`);
            
            return this.parseConfigData(config);
            
        } catch (dbError) {
            console.error('❌ Lỗi truy vấn database:', dbError);
            return this.getDefaultConfigByName(tenChiSo);
        }
    }
    
    static async getAllConfigs() {
        try {
            console.log(`🔍 Đang lấy tất cả cấu hình`);
            
            const [configRows] = await db.execute(
                'SELECT * FROM cau_hinh_chi_so_canh_bao ORDER BY ten_chi_so ASC'
            );
            
            const configs = configRows.map(config => {
                const parsed = this.parseConfigData(config);
                return {
                    ten_chi_so: config.ten_chi_so,
                    ...parsed,
                    ngay_tao: config.ngay_tao,
                    ngay_cap_nhat: config.ngay_cap_nhat
                };
            });
            
            return {
                configs: configs
            };
            
        } catch (dbError) {
            console.error('❌ Lỗi truy vấn database:', dbError);
            return {
                configs: []
            };
        }
    }
    
    static parseConfigData(config) {
        let configLimits = {
            thap: null,
            binh_thuong: null,
            cao: null,
            nguy_hiem: null
        };
        
        try {
            let gioiHan = null;
            
            // Parse JSON từ trường gioi_han_canh_bao
            if (config.gioi_han_canh_bao) {
                if (typeof config.gioi_han_canh_bao === 'string') {
                    gioiHan = JSON.parse(config.gioi_han_canh_bao);
                } else {
                    gioiHan = config.gioi_han_canh_bao;
                }
                
                console.log(`📋 Giới hạn cấu hình cho ${config.ten_chi_so}:`, JSON.stringify(gioiHan, null, 2));
                
                // Xác định loại chỉ số từ tên
                const tenChiSo = config.ten_chi_so.toLowerCase();
                
                if (tenChiSo.includes('spo2') || tenChiSo.includes('sp02')) {
                    configLimits = this.parseSpo2Config(gioiHan);
                    
                } else if (tenChiSo.includes('đường huyết') || tenChiSo.includes('duong huyet') || tenChiSo.includes('glucose')) {
                    configLimits = this.parseGlucoseConfig(gioiHan);
                    
                } else if (tenChiSo.includes('huyết áp') || tenChiSo.includes('huyet ap') || tenChiSo.includes('blood')) {
                    configLimits = this.parseBloodPressureConfig(gioiHan);
                    
                } else if (tenChiSo.includes('nhịp tim') || tenChiSo.includes('nhip tim') || tenChiSo.includes('heart')) {
                    configLimits = this.parseHeartRateConfig(gioiHan);
                    
                } else if (tenChiSo.includes('nhiệt độ') || tenChiSo.includes('nhiet do') || tenChiSo.includes('temperature')) {
                    configLimits = this.parseTemperatureConfig(gioiHan);
                    
                } else {
                    configLimits = this.parseGeneralConfig(gioiHan);
                }
                
                console.log(`✅ Đã parse cấu hình cho ${config.ten_chi_so}`);
            }
        } catch (parseError) {
            console.error('❌ Lỗi parse cấu hình JSON:', parseError);
            console.error('Nội dung gioi_han_canh_bao:', config.gioi_han_canh_bao);
            return this.getDefaultConfigByName(config.ten_chi_so);
        }
        
        return {
            configLimits
        };
    }
    
    // Parse cấu hình SpO2
    static parseSpo2Config(gioiHan) {
        const configLimits = {
            thap: null,
            binh_thuong: null,
            cao: null,
            nguy_hiem: null
        };
        
        // Xử lý theo cấu trúc JSON từ DB của bạn
        // {"binh_thuong":{"min":12,"max":20},"thap":{"max":21},"cao":{"min":22},"bat_on":{"min":23,"max":25},"nguy_hiem":{"min":26,"max":30}}
        
        if (gioiHan.binh_thuong) {
            configLimits.binh_thuong = {
                min: gioiHan.binh_thuong.min,
                max: gioiHan.binh_thuong.max,
                description: 'SpO2 bình thường',
                unit: '%'
            };
        }
        
        if (gioiHan.thap) {
            configLimits.thap = {
                max: gioiHan.thap.max,
                description: 'SpO2 thấp',
                unit: '%'
            };
        }
        
        if (gioiHan.cao) {
            configLimits.cao = {
                min: gioiHan.cao.min,
                description: 'SpO2 cao',
                unit: '%'
            };
        }
        
        if (gioiHan.nguy_hiem) {
            configLimits.nguy_hiem = {
                min: gioiHan.nguy_hiem.min,
                max: gioiHan.nguy_hiem.max,
                description: 'SpO2 nguy hiểm',
                message: 'Giá trị nguy hiểm! Cần can thiệp ngay.',
                unit: '%'
            };
        }
        
        // Xử lý bat_on nếu có
        if (gioiHan.bat_on) {
            configLimits.cao = configLimits.cao || {};
            configLimits.cao.min = gioiHan.bat_on.min;
            configLimits.cao.max = gioiHan.bat_on.max;
            configLimits.cao.description = 'SpO2 bất ổn';
        }
        
        return configLimits;
    }
    
    // Parse cấu hình đường huyết
    static parseGlucoseConfig(gioiHan) {
        const configLimits = {
            thap: null,
            binh_thuong: null,
            cao: null,
            nguy_hiem: null
        };
        
        if (gioiHan.thap) {
            configLimits.thap = {
                min: gioiHan.thap.min || gioiHan.thap.tam_thu_min,
                max: gioiHan.thap.max || gioiHan.thap.tam_thu_max,
                description: 'Hạ đường huyết',
                unit: 'mmol/L'
            };
        }
        
        if (gioiHan.binh_thuong) {
            configLimits.binh_thuong = {
                min: gioiHan.binh_thuong.min || gioiHan.binh_thuong.tam_thu_min,
                max: gioiHan.binh_thuong.max || gioiHan.binh_thuong.tam_thu_max,
                description: 'Đường huyết bình thường',
                unit: 'mmol/L'
            };
        }
        
        if (gioiHan.cao) {
            configLimits.cao = {
                min: gioiHan.cao.min || gioiHan.cao.tam_thu_min,
                max: gioiHan.cao.max || gioiHan.cao.tam_thu_max,
                description: 'Tăng đường huyết',
                unit: 'mmol/L'
            };
        }
        
        if (gioiHan.nguy_hiem) {
            configLimits.nguy_hiem = {
                min: gioiHan.nguy_hiem.min || gioiHan.nguy_hiem.tam_thu_min,
                max: gioiHan.nguy_hiem.max || gioiHan.nguy_hiem.tam_thu_max,
                description: gioiHan.nguy_hiem.danh_gia || 'Đường huyết nguy hiểm',
                message: gioiHan.nguy_hiem.message || 'Giá trị nguy hiểm! Cần can thiệp ngay.',
                unit: 'mmol/L'
            };
        }
        
        return configLimits;
    }
    
    // Parse cấu hình huyết áp - ĐÃ SỬA
    static parseBloodPressureConfig(gioiHan) {
        const configLimits = {
            thap: null,
            binh_thuong: null,
            cao: null,
            nguy_hiem: null
        };
        
        // Xử lý theo cấu trúc JSON mới của huyết áp
        // {"thap":{"tam_thu_min":80,"tam_thu_max":89,"tam_truong_min":50,"tam_truong_max":59,...},...}
        
        if (gioiHan.thap) {
            configLimits.thap = {
                description: 'Huyết áp thấp',
                message: gioiHan.thap.message || 'Huyết áp thấp',
                unit: 'mmHg',
                // Giữ nguyên các trường đặc biệt cho huyết áp
                tam_thu_min: gioiHan.thap.tam_thu_min,
                tam_thu_max: gioiHan.thap.tam_thu_max,
                tam_truong_min: gioiHan.thap.tam_truong_min,
                tam_truong_max: gioiHan.thap.tam_truong_max
            };
        }
        
        if (gioiHan.binh_thuong) {
            configLimits.binh_thuong = {
                description: 'Huyết áp bình thường',
                message: gioiHan.binh_thuong.message || 'Huyết áp bình thường',
                unit: 'mmHg',
                tam_thu_min: gioiHan.binh_thuong.tam_thu_min,
                tam_thu_max: gioiHan.binh_thuong.tam_thu_max,
                tam_truong_min: gioiHan.binh_thuong.tam_truong_min,
                tam_truong_max: gioiHan.binh_thuong.tam_truong_max
            };
        }
        
        if (gioiHan.cao) {
            configLimits.cao = {
                description: 'Huyết áp cao',
                message: gioiHan.cao.message || 'Huyết áp cao',
                unit: 'mmHg',
                tam_thu_min: gioiHan.cao.tam_thu_min,
                tam_thu_max: gioiHan.cao.tam_thu_max,
                tam_truong_min: gioiHan.cao.tam_truong_min,
                tam_truong_max: gioiHan.cao.tam_truong_max
            };
        }
        
        if (gioiHan.nguy_hiem) {
            configLimits.nguy_hiem = {
                description: 'Huyết áp nguy hiểm',
                message: gioiHan.nguy_hiem.message || 'Giá trị nguy hiểm! Cần can thiệp ngay.',
                unit: 'mmHg'
            };
        }
        
        return configLimits;
    }
    
    // Parse cấu hình chung
    static parseGeneralConfig(gioiHan) {
        const configLimits = {
            thap: null,
            binh_thuong: null,
            cao: null,
            nguy_hiem: null
        };
        
        if (gioiHan.thap) {
            configLimits.thap = {
                min: gioiHan.thap.min || gioiHan.thap.tam_thu_min,
                max: gioiHan.thap.max || gioiHan.thap.tam_thu_max,
                description: gioiHan.thap.danh_gia || 'Thấp'
            };
        }
        
        if (gioiHan.binh_thuong) {
            configLimits.binh_thuong = {
                min: gioiHan.binh_thuong.min || gioiHan.binh_thuong.tam_thu_min,
                max: gioiHan.binh_thuong.max || gioiHan.binh_thuong.tam_thu_max,
                description: gioiHan.binh_thuong.danh_gia || 'Bình thường'
            };
        }
        
        if (gioiHan.cao) {
            configLimits.cao = {
                min: gioiHan.cao.min || gioiHan.cao.tam_thu_min,
                max: gioiHan.cao.max || gioiHan.cao.tam_thu_max,
                description: gioiHan.cao.danh_gia || 'Cao'
            };
        }
        
        if (gioiHan.nguy_hiem) {
            configLimits.nguy_hiem = {
                min: gioiHan.nguy_hiem.min || gioiHan.nguy_hiem.tam_thu_min,
                max: gioiHan.nguy_hiem.max || gioiHan.nguy_hiem.tam_thu_max,
                description: gioiHan.nguy_hiem.danh_gia || 'Nguy hiểm',
                message: gioiHan.nguy_hiem.message || 'Giá trị nguy hiểm! Cần can thiệp ngay.'
            };
        }
        
        return configLimits;
    }
    
    // Parse cấu hình nhịp tim
    static parseHeartRateConfig(gioiHan) {
        const configLimits = this.parseGeneralConfig(gioiHan);
        
        // Thêm unit cho nhịp tim
        if (configLimits.thap) configLimits.thap.unit = 'bpm';
        if (configLimits.binh_thuong) configLimits.binh_thuong.unit = 'bpm';
        if (configLimits.cao) configLimits.cao.unit = 'bpm';
        if (configLimits.nguy_hiem) configLimits.nguy_hiem.unit = 'bpm';
        
        return configLimits;
    }
    
    // Parse cấu hình nhiệt độ
    static parseTemperatureConfig(gioiHan) {
        const configLimits = this.parseGeneralConfig(gioiHan);
        
        // Thêm unit cho nhiệt độ
        if (configLimits.thap) configLimits.thap.unit = '°C';
        if (configLimits.binh_thuong) configLimits.binh_thuong.unit = '°C';
        if (configLimits.cao) configLimits.cao.unit = '°C';
        if (configLimits.nguy_hiem) configLimits.nguy_hiem.unit = '°C';
        
        return configLimits;
    }
    
    // Cấu hình mặc định chung
    static getDefaultConfig() {
        console.log('⚠️ Sử dụng giới hạn mặc định');
        
        return {
            configLimits: {
                thap: {
                    min: 0,
                    max: 3.9,
                    description: 'Đường huyết thấp',
                    unit: 'mmol/L'
                },
                binh_thuong: {
                    min: 3.9,
                    max: 6.1,
                    description: 'Đường huyết bình thường',
                    unit: 'mmol/L'
                },
                cao: {
                    min: 6.2,
                    max: 11.0,
                    description: 'Đường huyết cao',
                    unit: 'mmol/L'
                },
                nguy_hiem: {
                    description: 'Đường huyết rất cao',
                    message: 'Nguy cơ biến chứng nghiêm trọng',
                    unit: 'mmol/L'
                }
            }
        };
    }
    
    // Cấu hình mặc định theo tên chỉ số
    static getDefaultConfigByName(tenChiSo) {
        const lowerName = tenChiSo.toLowerCase();
        
        if (lowerName.includes('spo2') || lowerName.includes('sp02')) {
            return {
                configLimits: {
                    nguy_hiem: { 
                        max: 90, 
                        description: 'Thiếu oxy nghiêm trọng',
                        unit: '%'
                    },
                    thap: { 
                        min: 90, 
                        max: 94, 
                        description: 'Thiếu oxy nhẹ',
                        unit: '%'
                    },
                    binh_thuong: { 
                        min: 94, 
                        max: 100, 
                        description: 'SpO2 bình thường',
                        unit: '%'
                    }
                }
            };
        } else if (lowerName.includes('đường huyết') || lowerName.includes('duong huyet')) {
            return {
                configLimits: {
                    thap: { 
                        min: 0, 
                        max: 3.9, 
                        description: 'Hạ đường huyết',
                        unit: 'mmol/L'
                    },
                    binh_thuong: { 
                        min: 3.9, 
                        max: 6.1, 
                        description: 'Đường huyết bình thường',
                        unit: 'mmol/L'
                    },
                    cao: { 
                        min: 6.2, 
                        max: 11.0, 
                        description: 'Tăng đường huyết',
                        unit: 'mmol/L'
                    },
                    nguy_hiem: { 
                        min: 11.1, 
                        description: 'Đường huyết rất cao - Nguy hiểm',
                        unit: 'mmol/L'
                    }
                }
            };
        } else if (lowerName.includes('huyết áp') || lowerName.includes('huyet ap')) {
            return {
                configLimits: {
                    thap: { 
                        min: 80, 
                        max: 89, 
                        description: 'Huyết áp thấp',
                        message: 'Huyết áp thấp (<90/60 mmHg)',
                        unit: 'mmHg',
                        tam_thu_min: 80,
                        tam_thu_max: 89,
                        tam_truong_min: 50,
                        tam_truong_max: 59
                    },
                    binh_thuong: { 
                        min: 90, 
                        max: 119, 
                        description: 'Huyết áp bình thường',
                        message: 'Huyết áp trong giới hạn bình thường',
                        unit: 'mmHg',
                        tam_thu_min: 90,
                        tam_thu_max: 119,
                        tam_truong_min: 60,
                        tam_truong_max: 79
                    },
                    cao: { 
                        min: 120, 
                        max: 179, 
                        description: 'Huyết áp cao',
                        message: 'Huyết áp cao',
                        unit: 'mmHg',
                        tam_thu_min: 120,
                        tam_thu_max: 179,
                        tam_truong_min: 80,
                        tam_truong_max: 119
                    },
                    nguy_hiem: { 
                        description: 'Huyết áp nguy hiểm',
                        message: 'Huyết áp nguy hiểm! Cần can thiệp ngay.',
                        unit: 'mmHg'
                    }
                }
            };
        } else if (lowerName.includes('nhịp tim') || lowerName.includes('nhip tim')) {
            return {
                configLimits: {
                    thap: { 
                        min: 0, 
                        max: 60, 
                        description: 'Nhịp tim chậm',
                        unit: 'bpm'
                    },
                    binh_thuong: { 
                        min: 60, 
                        max: 100, 
                        description: 'Nhịp tim bình thường',
                        unit: 'bpm'
                    },
                    cao: { 
                        min: 100, 
                        max: 120, 
                        description: 'Nhịp tim nhanh',
                        unit: 'bpm'
                    },
                    nguy_hiem: { 
                        min: 120, 
                        description: 'Nhịp tim rất nhanh - Nguy hiểm',
                        unit: 'bpm'
                    }
                }
            };
        } else if (lowerName.includes('nhiệt độ') || lowerName.includes('nhiet do')) {
            return {
                configLimits: {
                    thap: { 
                        min: 0, 
                        max: 36, 
                        description: 'Hạ thân nhiệt',
                        unit: '°C'
                    },
                    binh_thuong: { 
                        min: 36, 
                        max: 37.5, 
                        description: 'Nhiệt độ bình thường',
                        unit: '°C'
                    },
                    cao: { 
                        min: 37.5, 
                        max: 38.5, 
                        description: 'Sốt nhẹ',
                        unit: '°C'
                    },
                    nguy_hiem: { 
                        min: 38.5, 
                        description: 'Sốt cao - Nguy hiểm',
                        unit: '°C'
                    }
                }
            };
        }
        
        return this.getDefaultConfig();
    }
    
    // Đánh giá giá trị dựa trên cấu hình - THÊM XỬ LÝ ĐẶC BIỆT CHO HUYẾT ÁP
    static evaluateValue(value, configLimits, value2 = null) {
        if (!configLimits) return 'khong_xac_dinh';
        
        // Kiểm tra xem có phải cấu hình huyết áp không (có tam_thu_min, tam_truong_min)
        const isBloodPressure = configLimits.binh_thuong && 
                               (configLimits.binh_thuong.tam_thu_min !== undefined || 
                                configLimits.binh_thuong.tam_truong_min !== undefined);
        
        // Nếu là huyết áp và có value2 (tâm trương)
        if (isBloodPressure && value2 !== null) {
            return this.evaluateBloodPressure(value, value2, configLimits);
        }
        
        // Đánh giá cho các chỉ số đơn giá trị
        return this.evaluateSingleValue(value, configLimits);
    }
    
    // Đánh giá huyết áp (2 giá trị)
    static evaluateBloodPressure(tamThu, tamTruong, configLimits) {
        // Kiểm tra nguy hiểm trước
        if (configLimits.nguy_hiem) {
            // Nguy hiểm nếu huyết áp rất cao
            if (tamThu >= 180 || tamTruong >= 120) {
                return 'nguy_hiem';
            }
            // Nguy hiểm nếu huyết áp rất thấp
            if (tamThu < 90 || tamTruong < 60) {
                return 'nguy_hiem';
            }
        }
        
        // Kiểm tra cao
        if (configLimits.cao && configLimits.cao.tam_thu_min !== undefined) {
            if (tamThu >= configLimits.cao.tam_thu_min && 
                tamThu <= configLimits.cao.tam_thu_max &&
                tamTruong >= configLimits.cao.tam_truong_min && 
                tamTruong <= configLimits.cao.tam_truong_max) {
                return 'cao';
            }
        }
        
        // Kiểm tra bình thường
        if (configLimits.binh_thuong && configLimits.binh_thuong.tam_thu_min !== undefined) {
            if (tamThu >= configLimits.binh_thuong.tam_thu_min && 
                tamThu <= configLimits.binh_thuong.tam_thu_max &&
                tamTruong >= configLimits.binh_thuong.tam_truong_min && 
                tamTruong <= configLimits.binh_thuong.tam_truong_max) {
                return 'binh_thuong';
            }
        }
        
        // Kiểm tra thấp
        if (configLimits.thap && configLimits.thap.tam_thu_min !== undefined) {
            if (tamThu >= configLimits.thap.tam_thu_min && 
                tamThu <= configLimits.thap.tam_thu_max &&
                tamTruong >= configLimits.thap.tam_truong_min && 
                tamTruong <= configLimits.thap.tam_truong_max) {
                return 'thap';
            }
        }
        
        return 'ngoai_pham_vi';
    }
    
    // Đánh giá cho các chỉ số đơn giá trị
    static evaluateSingleValue(value, configLimits) {
        // Đầu tiên kiểm tra nguy hiểm
        if (configLimits.nguy_hiem) {
            if (configLimits.nguy_hiem.min !== undefined && value >= configLimits.nguy_hiem.min) {
                return 'nguy_hiem';
            }
            if (configLimits.nguy_hiem.max !== undefined && value <= configLimits.nguy_hiem.max) {
                return 'nguy_hiem';
            }
        }
        
        // Kiểm tra cao
        if (configLimits.cao && configLimits.cao.min !== undefined && configLimits.cao.max !== undefined) {
            if (value >= configLimits.cao.min && value <= configLimits.cao.max) {
                return 'cao';
            }
        }
        
        // Kiểm tra thấp
        if (configLimits.thap && configLimits.thap.min !== undefined && configLimits.thap.max !== undefined) {
            if (value >= configLimits.thap.min && value <= configLimits.thap.max) {
                return 'thap';
            }
        }
        
        // Kiểm tra bình thường
        if (configLimits.binh_thuong && configLimits.binh_thuong.min !== undefined && configLimits.binh_thuong.max !== undefined) {
            if (value >= configLimits.binh_thuong.min && value <= configLimits.binh_thuong.max) {
                return 'binh_thuong';
            }
        }
        
        return 'ngoai_pham_vi';
    }
    
    // Tạo cấu hình mới
    static async createConfig(data) {
        try {
            const { ten_chi_so, gioi_han_canh_bao } = data;
            
            if (!ten_chi_so || !gioi_han_canh_bao) {
                throw new Error('Thiếu thông tin bắt buộc: ten_chi_so, gioi_han_canh_bao');
            }
            
            // Validate JSON
            let parsedGioiHan;
            try {
                if (typeof gioi_han_canh_bao === 'string') {
                    parsedGioiHan = JSON.parse(gioi_han_canh_bao);
                } else {
                    parsedGioiHan = gioi_han_canh_bao;
                }
                
                if (typeof parsedGioiHan !== 'object' || parsedGioiHan === null) {
                    throw new Error('gioi_han_canh_bao phải là object JSON hợp lệ');
                }
            } catch (parseError) {
                throw new Error('gioi_han_canh_bao không phải là JSON hợp lệ: ' + parseError.message);
            }
            
            const [result] = await db.execute(
                'INSERT INTO cau_hinh_chi_so_canh_bao (ten_chi_so, gioi_han_canh_bao) VALUES (?, ?)',
                [ten_chi_so, JSON.stringify(parsedGioiHan)]
            );
            
            console.log(`✅ Đã tạo cấu hình mới với ID: ${result.insertId}`);
            
            return {
                success: true,
                id: result.insertId,
                message: 'Tạo cấu hình thành công'
            };
            
        } catch (error) {
            console.error('❌ Lỗi tạo cấu hình:', error);
            throw error;
        }
    }
    
    // Cập nhật cấu hình
    static async updateConfig(configId, data) {
        try {
            if (!configId) {
                throw new Error('Thiếu configId');
            }
            
            const { ten_chi_so, gioi_han_canh_bao } = data;
            
            if (!ten_chi_so && !gioi_han_canh_bao) {
                throw new Error('Cần ít nhất một trường để cập nhật');
            }
            
            let updateFields = [];
            let updateValues = [];
            
            if (ten_chi_so) {
                updateFields.push('ten_chi_so = ?');
                updateValues.push(ten_chi_so);
            }
            
            if (gioi_han_canh_bao) {
                try {
                    let parsedGioiHan;
                    if (typeof gioi_han_canh_bao === 'string') {
                        parsedGioiHan = JSON.parse(gioi_han_canh_bao);
                    } else {
                        parsedGioiHan = gioi_han_canh_bao;
                    }
                    
                    updateFields.push('gioi_han_canh_bao = ?');
                    updateValues.push(JSON.stringify(parsedGioiHan));
                } catch (parseError) {
                    throw new Error('gioi_han_canh_bao không phải là JSON hợp lệ: ' + parseError.message);
                }
            }
            
            updateValues.push(configId);
            
            const query = `UPDATE cau_hinh_chi_so_canh_bao SET ${updateFields.join(', ')}, ngay_cap_nhat = NOW() WHERE id = ?`;
            
            const [result] = await db.execute(query, updateValues);
            
            if (result.affectedRows === 0) {
                throw new Error('Không tìm thấy cấu hình để cập nhật');
            }
            
            console.log(`✅ Đã cập nhật cấu hình ID: ${configId}`);
            
            return {
                success: true,
                message: 'Cập nhật cấu hình thành công'
            };
            
        } catch (error) {
            console.error('❌ Lỗi cập nhật cấu hình:', error);
            throw error;
        }
    }
    
    // Xóa cấu hình
    static async deleteConfig(configId) {
        try {
            if (!configId) {
                throw new Error('Thiếu configId');
            }
            
            const [result] = await db.execute(
                'DELETE FROM cau_hinh_chi_so_canh_bao WHERE id = ?',
                [configId]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Không tìm thấy cấu hình để xóa');
            }
            
            console.log(`✅ Đã xóa cấu hình ID: ${configId}`);
            
            return {
                success: true,
                message: 'Xóa cấu hình thành công'
            };
            
        } catch (error) {
            console.error('❌ Lỗi xóa cấu hình:', error);
            throw error;
        }
    }
}

module.exports = ConfigService;