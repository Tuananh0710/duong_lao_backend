const connection = require('../config/database');

class nhietDo {
    static async create(data) {
        try {
            const {
                id_benh_nhan,
                gia_tri_nhiet_do,
                danh_gia_chi_tiet,
                thoi_gian_do,
                vi_tri_do,
                tinh_trang_luc_do,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao,
                id_cau_hinh_chi_so_canh_bao
            } = data;

            // Nếu chưa có đánh giá, tự động đánh giá dựa trên cấu hình
            let evaluationResult = null;
            if (gia_tri_nhiet_do !== undefined && gia_tri_nhiet_do !== null) {
                if (!danh_gia_chi_tiet || !muc_do) {
                    evaluationResult = await this.evaluateTemperature(
                        gia_tri_nhiet_do,
                        vi_tri_do
                    );
                }
            }

            const query = `
                INSERT INTO nhiet_do 
                (id_benh_nhan, gia_tri_nhiet_do, danh_gia_chi_tiet, thoi_gian_do, 
                 vi_tri_do, tinh_trang_luc_do, ghi_chu, muc_do, noi_dung_canh_bao, id_cau_hinh_chi_so_canh_bao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                id_benh_nhan,
                gia_tri_nhiet_do,
                evaluationResult ? evaluationResult.danh_gia_chi_tiet : (danh_gia_chi_tiet || null),
                thoi_gian_do || new Date(),
                vi_tri_do,
                tinh_trang_luc_do,
                ghi_chu || null,
                evaluationResult ? evaluationResult.muc_do : (muc_do || null),
                evaluationResult ? evaluationResult.noi_dung_canh_bao : (noi_dung_canh_bao || null),
                evaluationResult ? evaluationResult.id_cau_hinh : (id_cau_hinh_chi_so_canh_bao || null)
            ];
            
            const [result] = await connection.execute(query, values);
            
            // Lấy bản ghi vừa thêm
            const newId = result.insertId;
            const newRecord = await this.findById(newId);
            
            return {
                success: true,
                message: 'Thêm dữ liệu nhiệt độ thành công',
                data: newRecord
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu nhiệt độ:', error);
            throw new Error('Không thể thêm dữ liệu nhiệt độ: ' + error.message);
        }
    };

    static async findById(id) {
        try {
            const query = `
                SELECT nd.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhiet_do nd
                LEFT JOIN benh_nhan bn ON nd.id_benh_nhan = bn.id
                WHERE nd.id = ?
            `;
            const [rows] = await connection.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu nhiệt độ theo ID:', error);
            throw new Error('Không thể lấy dữ liệu nhiệt độ: ' + error.message);
        }
    }

    static async findByBenhNhan(idBenhNhan, filters = {}) {
        try {
            let query = `
                SELECT nd.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhiet_do nd
                LEFT JOIN benh_nhan bn ON nd.id_benh_nhan = bn.id
                WHERE nd.id_benh_nhan = ?
            `;
            
            const values = [idBenhNhan];

            if (filters.from_date) {
                query += ' AND DATE(nd.thoi_gian_do) >= ?';
                values.push(filters.from_date);
            }

            if (filters.to_date) {
                query += ' AND DATE(nd.thoi_gian_do) <= ?';
                values.push(filters.to_date);
            }

            if (filters.vi_tri_do) {
                query += ' AND nd.vi_tri_do = ?';
                values.push(filters.vi_tri_do);
            }

            if (filters.tinh_trang_luc_do) {
                query += ' AND nd.tinh_trang_luc_do = ?';
                values.push(filters.tinh_trang_luc_do);
            }

            if (filters.muc_do) {
                query += ' AND nd.muc_do = ?';
                values.push(filters.muc_do);
            }

            query += ' ORDER BY nd.thoi_gian_do DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                values.push(parseInt(filters.limit));
            }

            const [rows] = await connection.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu nhiệt độ theo bệnh nhân:', error);
            throw new Error('Không thể lấy dữ liệu nhiệt độ của bệnh nhân: ' + error.message);
        }
    };

    static async findLatestByBenhNhan(idBenhNhan) {
        try {
            const query = `
                SELECT nd.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhiet_do nd
                LEFT JOIN benh_nhan bn ON nd.id_benh_nhan = bn.id
                WHERE nd.id_benh_nhan = ?
                ORDER BY nd.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu nhiệt độ gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu nhiệt độ gần nhất: ' + error.message);
        }
    };

    static async update(id, data) {
        try {
            const fields = [];
            const values = [];

            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(data[key]);
                }
            });

            if (fields.length === 0) {
                return { success: false, message: 'Không có dữ liệu để cập nhật' };
            }

            fields.push('ngay_cap_nhat = CURRENT_TIMESTAMP');
            
            values.push(id);

            const query = `UPDATE nhiet_do SET ${fields.join(', ')} WHERE id = ?`;
            
            const [result] = await connection.execute(query, values);
            
            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để cập nhật' };
            }

            const updatedRecord = await this.findById(id);
            
            return {
                success: true,
                message: 'Cập nhật dữ liệu nhiệt độ thành công',
                data: updatedRecord
            };
        } catch (error) {
            console.error('Lỗi khi cập nhật dữ liệu nhiệt độ:', error);
            throw new Error('Không thể cập nhật dữ liệu nhiệt độ: ' + error.message);
        }
    };

    static async delete(id) {
        try {
            const query = 'DELETE FROM nhiet_do WHERE id = ?';
            const [result] = await connection.execute(query, [id]);
            
            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để xóa' };
            }

            return {
                success: true,
                message: 'Xóa dữ liệu nhiệt độ thành công',
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu nhiệt độ:', error);
            throw new Error('Không thể xóa dữ liệu nhiệt độ: ' + error.message);
        }
    }

    static async evaluateTemperature(tempCelsius) {
        try {
            // Tên chỉ số cho Nhiệt độ
            let tenChiSo = 'Nhiệt độ';
            
            
            // Tìm cấu hình mới nhất theo tên chỉ số
            const [configs] = await connection.execute(
                'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so = ? ORDER BY ngay_tao DESC LIMIT 1',
                [tenChiSo]
            );
            
            let cauHinh = null;
            let idCauHinh = null;
            
            if (configs.length > 0) {
                cauHinh = configs[0];
                idCauHinh = cauHinh.id;
            }

            // Nếu không có cấu hình cụ thể, tìm chung
            if (!cauHinh) {
                const [generalConfigs] = await connection.execute(
                    'SELECT * FROM cau_hinh_chi_so_canh_bao WHERE ten_chi_so LIKE ? ORDER BY ngay_tao DESC LIMIT 1',
                    ['%Nhiệt độ%']
                );
                
                if (generalConfigs.length > 0) {
                    cauHinh = generalConfigs[0];
                    idCauHinh = cauHinh.id;
                }
            }

            // Nếu không có cấu hình, sử dụng đánh giá mặc định
            if (!cauHinh || !cauHinh.gioi_han_canh_bao) {
                return this.evaluateTemperatureDefault(tempCelsius, idCauHinh);
            }

            // Parse JSON cấu hình
            let gioiHan;
            try {
                gioiHan = typeof cauHinh.gioi_han_canh_bao === 'string' 
                    ? JSON.parse(cauHinh.gioi_han_canh_bao) 
                    : cauHinh.gioi_han_canh_bao;
            } catch (e) {
                console.error('Error parsing gioi_han_canh_bao:', e);
                return this.evaluateTemperatureDefault(tempCelsius, idCauHinh);
            }

            // Đánh giá dựa trên cấu hình
            return this.evaluateBasedOnConfig(tempCelsius, gioiHan, viTriDo, idCauHinh);
            
        } catch (error) {
            console.error('Error evaluating temperature:', error);
            return this.evaluateTemperatureDefault(tempCelsius, null);
        }
    };

    // Hàm đánh giá dựa trên cấu hình JSON
    static evaluateBasedOnConfig(tempCelsius, gioiHan, idCauHinh) {
        const numericValue = parseFloat(tempCelsius);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                id_cau_hinh: idCauHinh
            };
        }

        // Kiểm tra theo thứ tự: Thấp -> Bình thường -> Cao -> Nguy hiểm
        // (theo logic từ hàm evaluateSingleValue trước đó)
        
        // Thấp: giá trị trong khoảng [min, max]
        if (gioiHan.thap && gioiHan.thap.min !== undefined && gioiHan.thap.max !== undefined) {
            if (numericValue >= gioiHan.thap.min && numericValue <= gioiHan.thap.max) {
                return {
                    danh_gia_chi_tiet: gioiHan.thap.danh_gia || 'Nhiệt độ thấp',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.thap.message || 'Nhiệt độ thấp, cần theo dõi.',
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Bình thường: giá trị trong khoảng [min, max]
        if (gioiHan.binh_thuong && gioiHan.binh_thuong.min !== undefined && gioiHan.binh_thuong.max !== undefined) {
            if (numericValue >= gioiHan.binh_thuong.min && numericValue <= gioiHan.binh_thuong.max) {
                return {
                    danh_gia_chi_tiet: gioiHan.binh_thuong.danh_gia || 'Bình thường',
                    muc_do: 'binh_thuong',
                    noi_dung_canh_bao: gioiHan.binh_thuong.message || null,
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Cao: giá trị trong khoảng [min, max]
        if (gioiHan.cao && gioiHan.cao.min !== undefined && gioiHan.cao.max !== undefined) {
            if (numericValue >= gioiHan.cao.min && numericValue <= gioiHan.cao.max) {
                return {
                    danh_gia_chi_tiet: gioiHan.cao.danh_gia || 'Nhiệt độ cao',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.cao.message || 'Nhiệt độ cao, cần theo dõi.',
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Nguy hiểm: Nếu giá trị không thuộc bất kỳ mốc nào
        let nguyHiemMessage = 'Nhiệt độ nguy hiểm! Cần can thiệp ngay.';
        let nguyHiemDanhGia = 'Nguy hiểm';
        
        if (gioiHan.nguy_hiem && gioiHan.nguy_hiem.message) {
            nguyHiemMessage = gioiHan.nguy_hiem.message;
        }
        if (gioiHan.nguy_hiem && gioiHan.nguy_hiem.danh_gia) {
            nguyHiemDanhGia = gioiHan.nguy_hiem.danh_gia;
        }
        
        return {
            danh_gia_chi_tiet: nguyHiemDanhGia,
            muc_do: 'nguy_hiem',
            noi_dung_canh_bao: nguyHiemMessage,
            id_cau_hinh: idCauHinh
        };
    }

    // Hàm đánh giá mặc định (sử dụng khi không có cấu hình)
    static evaluateTemperatureDefault(tempCelsius, idCauHinh = null) {
        const numericValue = parseFloat(tempCelsius);
        
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            return {
                danh_gia_chi_tiet: 'Không thể đánh giá',
                muc_do: 'binh_thuong',
                noi_dung_canh_bao: 'Giá trị không hợp lệ',
                id_cau_hinh: idCauHinh
            };
        }

        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;

        // Đánh giá theo tiêu chuẩn y tế (độ C)
        if (numericValue >= 40.0) {
            danhGia = 'sot_rat_cao';
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Sốt rất cao - Cần can thiệp y tế ngay lập tức';
        } else if (numericValue >= 39.0) {
            danhGia = 'sot_cao';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Sốt cao - Cần theo dõi chặt chẽ';
        } else if (numericValue >= 38.0) {
            danhGia = 'sot_vua';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Sốt vừa - Cần theo dõi';
        } else if (numericValue >= 37.5) {
            danhGia = 'sot_nhe';
            mucDo = 'binh_thuong';
            noiDungCanhBao = 'Sốt nhẹ';
        } else if (numericValue <= 35.0) {
            danhGia = 'ha_than_nhiet';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Hạ thân nhiệt - Cần theo dõi';
        } else {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
        }

        return { 
            danh_gia_chi_tiet: danhGia, 
            muc_do: mucDo, 
            noi_dung_canh_bao: noiDungCanhBao,
            id_cau_hinh: idCauHinh
        };
    }

    static convertTemperature(tempCelsius, toUnit = 'f') {
        if (toUnit.toLowerCase() === 'f') {
            // Celsius to Fahrenheit
            return (tempCelsius * 9/5) + 32;
        } else if (toUnit.toLowerCase() === 'k') {
            // Celsius to Kelvin
            return tempCelsius + 273.15;
        }
        return tempCelsius;
    }

    // Hàm bổ sung: chuyển đổi Fahrenheit sang Celsius
    static fahrenheitToCelsius(tempFahrenheit) {
        return (tempFahrenheit - 32) * 5/9;
    }

    // Hàm bổ sung: chuyển đổi Kelvin sang Celsius
    static kelvinToCelsius(tempKelvin) {
        return tempKelvin - 273.15;
    }
}

module.exports = nhietDo;
