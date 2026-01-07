
const connection = require('../config/database');

class nhipTim {
    static async create(data) {
        try {
            const {
                id_benh_nhan,
                gia_tri_nhip_tim,
                danh_gia_chi_tiet,
                thoi_gian_do,
                tinh_trang_benh_nhan_khi_do,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao,
                id_cau_hinh_chi_so_canh_bao
            } = data;

            // Nếu chưa có đánh giá, tự động đánh giá dựa trên cấu hình
            let evaluationResult = null;
            if (gia_tri_nhip_tim !== undefined && gia_tri_nhip_tim !== null) {
                if (!danh_gia_chi_tiet || !muc_do) {
                    evaluationResult = await this.evaluateHeartRate(
                        gia_tri_nhip_tim,
                        tinh_trang_benh_nhan_khi_do
                    );
                }
            }

            const query = `
            INSERT INTO nhip_tim 
                (id_benh_nhan, gia_tri_nhip_tim, danh_gia_chi_tiet, thoi_gian_do, 
                 tinh_trang_benh_nhan_khi_do, ghi_chu, muc_do, noi_dung_canh_bao, id_cau_hinh_chi_so_canh_bao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                id_benh_nhan,
                gia_tri_nhip_tim,
                evaluationResult ? evaluationResult.danh_gia_chi_tiet : (danh_gia_chi_tiet || null),
                thoi_gian_do || new Date(),
                tinh_trang_benh_nhan_khi_do,
                ghi_chu || null,
                evaluationResult ? evaluationResult.muc_do : (muc_do || null),
                evaluationResult ? evaluationResult.noi_dung_canh_bao : (noi_dung_canh_bao || null),
                evaluationResult ? evaluationResult.id_cau_hinh : (id_cau_hinh_chi_so_canh_bao || null)
            ];
            
            // Đảm bảo không có undefined trong values
            const sanitizedValues = values.map(v => v === undefined ? null : v);
            const [result] = await connection.execute(query, sanitizedValues);
            
            // Lấy record vừa tạo bằng ID
            const newRecord = await this.findById(result.insertId);
            
            return {
                success: true,
                message: 'Thêm dữ liệu nhịp tim thành công',
                data: newRecord
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu nhịp tim:', error);
            throw new Error('Không thể thêm dữ liệu nhịp tim: ' + error.message);
        }
    };

    static async findById(id) {
        try {
            const query = `
            SELECT nt.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhip_tim nt
                LEFT JOIN benh_nhan bn ON nt.id_benh_nhan = bn.id
                WHERE nt.id = ?
            `;
            const [rows] = await connection.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu nhịp tim theo ID:', error);
            throw new Error('Không thể lấy dữ liệu nhịp tim: ' + error.message);
        }
    };

    static async findByBenhNhan(idBenhNhan, filters = {}) {
        try {
            let query = `
                SELECT nt.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhip_tim nt
                LEFT JOIN benh_nhan bn ON nt.id_benh_nhan = bn.id
                WHERE nt.id_benh_nhan = ?
            `;
            
            const values = [idBenhNhan];

            if (filters.from_date) {
                query += ' AND DATE(nt.thoi_gian_do) >= ?';
                values.push(filters.from_date);
            }

            if (filters.to_date) {
                query += ' AND DATE(nt.thoi_gian_do) <= ?';
                values.push(filters.to_date);
            }

            if (filters.tinh_trang_benh_nhan_khi_do) {
                query += ' AND nt.tinh_trang_benh_nhan_khi_do = ?';
                values.push(filters.tinh_trang_benh_nhan_khi_do);
            }

            if (filters.muc_do) {
                query += ' AND nt.muc_do = ?';
                values.push(filters.muc_do);
            }

            query += ' ORDER BY nt.thoi_gian_do DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                values.push(parseInt(filters.limit));
            }

            const [rows] = await connection.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu nhịp tim theo bệnh nhân:', error);
            throw new Error('Không thể lấy dữ liệu nhịp tim của bệnh nhân: ' + error.message);
        }
    };

    static async findLastestByBenhNhan(idBenhNhan) {
        try {
            const query = `
                SELECT nt.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhip_tim nt
                LEFT JOIN benh_nhan bn ON nt.id_benh_nhan = bn.id
                WHERE nt.id_benh_nhan = ?
                ORDER BY nt.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu nhịp tim gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu nhịp tim gần nhất: ' + error.message);
        }
    };

    static async update(id, data) {
        try {
            const fields = [];
            const values = [];

            // Xây dựng câu truy vấn động
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(data[key]);
                }
            });

            if (fields.length === 0) {
                return { success: false, message: 'Không có dữ liệu để cập nhật' };
            }

            // Thêm ngày cập nhật
            fields.push('ngay_cap_nhat = CURRENT_TIMESTAMP');
            
            // Thêm id vào values
            values.push(id);

            const query = `UPDATE nhip_tim SET ${fields.join(', ')} WHERE id = ?`;
            
            const [result] = await connection.execute(query, values);
            
            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để cập nhật' };
            }

            // Lấy lại dữ liệu đã cập nhật
            const updatedRecord = await this.findById(id);
            
            return {
                success: true,
                message: 'Cập nhật dữ liệu nhịp tim thành công',
                data: updatedRecord
            };
        } catch (error) {
            console.error('Lỗi khi cập nhật dữ liệu nhịp tim:', error);
            throw new Error('Không thể cập nhật dữ liệu nhịp tim: ' + error.message);
        }
    };

    static async delete(id) {
        try {
            const query = 'DELETE FROM nhip_tim WHERE id = ?';
            const [result] = await connection.execute(query, [id]);
            
            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để xóa' };
            }

            return {
                success: true,
                message: 'Xóa dữ liệu nhịp tim thành công',
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu nhịp tim:', error);
            throw new Error('Không thể xóa dữ liệu nhịp tim: ' + error.message);
        }
    }

    static async evaluateHeartRate(heartRate) {
        try {
            // Tên chỉ số cho Nhịp tim
            let tenChiSo = 'Nhịp tim';
            
           
            
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
                    ['%Nhịp tim%']
                );
                
                if (generalConfigs.length > 0) {
                    cauHinh = generalConfigs[0];
                    idCauHinh = cauHinh.id;
                }
            }

            // Nếu không có cấu hình, sử dụng đánh giá mặc định
            if (!cauHinh || !cauHinh.gioi_han_canh_bao) {
                return this.evaluateHeartRateDefault(heartRate, idCauHinh);
            }

            // Parse JSON cấu hình
            let gioiHan;
            try {
                gioiHan = typeof cauHinh.gioi_han_canh_bao === 'string' 
                    ? JSON.parse(cauHinh.gioi_han_canh_bao) 
                    : cauHinh.gioi_han_canh_bao;
            } catch (e) {
                console.error('Error parsing gioi_han_canh_bao:', e);
                return this.evaluateHeartRateDefault(heartRate, idCauHinh);
            }

            // Đánh giá dựa trên cấu hình
            return this.evaluateBasedOnConfig(heartRate, gioiHan, tinhTrangBenhNhan, idCauHinh);
            
        } catch (error) {
            console.error('Error evaluating heart rate:', error);
            return this.evaluateHeartRateDefault(heartRate, null);
        }
    };

    // Hàm đánh giá dựa trên cấu hình JSON
    static evaluateBasedOnConfig(heartRate, gioiHan, idCauHinh) {
        const numericValue = parseFloat(heartRate);
        
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
                    danh_gia_chi_tiet: gioiHan.thap.danh_gia || 'Nhịp tim thấp',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.thap.message || 'Nhịp tim thấp, cần theo dõi.',
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
                    danh_gia_chi_tiet: gioiHan.cao.danh_gia || 'Nhịp tim cao',
                    muc_do: 'canh_bao',
                    noi_dung_canh_bao: gioiHan.cao.message || 'Nhịp tim cao, cần theo dõi.',
                    id_cau_hinh: idCauHinh
                };
            }
        }

        // Nguy hiểm: Nếu giá trị không thuộc bất kỳ mốc nào
        let nguyHiemMessage = 'Nhịp tim nguy hiểm! Cần can thiệp ngay.';
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
    static evaluateHeartRateDefault(heartRate, idCauHinh = null) {
        const numericValue = parseFloat(heartRate);
        
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

        // Đánh giá theo tiêu chuẩn y tế (bpm)
        if (numericValue < 60) {
            danhGia = 'cham';
            if (numericValue < 50) {
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Nhịp tim chậm - Cần theo dõi';
            } else {
                mucDo = 'binh_thuong';
                noiDungCanhBao = 'Nhịp tim hơi chậm';
            }
        } else if (numericValue > 100) {
            danhGia = 'nhanh';
            if (numericValue > 120) {
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Nhịp tim nhanh - Cần theo dõi';
            } else {
                mucDo = 'binh_thuong';
                noiDungCanhBao = 'Nhịp tim hơi nhanh';
            }
        } else {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
        }

        // Trường hợp nguy hiểm
        if (numericValue < 40 || numericValue > 180) {
            mucDo = 'nguy_hiem';
            if (numericValue < 40) {
                noiDungCanhBao = 'Nhịp tim rất chậm - Cần cấp cứu';
            } else {
                noiDungCanhBao = 'Nhịp tim rất nhanh - Cần cấp cứu';
            }
        }

        return { 
            danh_gia_chi_tiet: danhGia, 
            muc_do: mucDo, 
            noi_dung_canh_bao: noiDungCanhBao,
            id_cau_hinh: idCauHinh
        };
    }

    // Hàm tính nhịp tim tối đa theo tuổi (220 - tuổi)
    static calculateMaxHeartRate(age) {
        if (!age || age <= 0) return null;
        return 220 - age;
    }

    // Hàm tính nhịp tim mục tiêu theo tuổi (50-85% của nhịp tim tối đa)
    static calculateTargetHeartRateZone(age) {
        if (!age || age <= 0) return null;
        
        const maxHeartRate = this.calculateMaxHeartRate(age);
        return {
            min: Math.round(maxHeartRate * 0.50),
            max: Math.round(maxHeartRate * 0.85),
            maxHeartRate: maxHeartRate
        };
    }

    // Hàm đánh giá nhịp tim theo độ tuổi
    static evaluateHeartRateByAge(heartRate, age, tinhTrang = 'nghi_ngoi') {
        if (!age || age <= 0) {
            return this.evaluateHeartRateDefault(heartRate, null);
        }
        
        const maxHeartRate = this.calculateMaxHeartRate(age);
        const targetZone = this.calculateTargetHeartRateZone(age);
        
        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;

        const heartRatePercentage = (heartRate / maxHeartRate) * 100;

        if (heartRate < 60) {
            danhGia = 'cham';
            mucDo = heartRate < 50 ? 'canh_bao' : 'binh_thuong';
            noiDungCanhBao = heartRate < 50 ? 'Nhịp tim chậm so với độ tuổi' : 'Nhịp tim hơi chậm';
        } else if (heartRate > targetZone.max) {
            danhGia = 'nhanh';
            mucDo = heartRate > maxHeartRate * 0.9 ? 'canh_bao' : 'binh_thuong';
            noiDungCanhBao = `Nhịp tim vượt ngưỡng an toàn (${targetZone.max} bpm)`;
        } else if (heartRate >= targetZone.min && heartRate <= targetZone.max) {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
            noiDungCanhBao = 'Nhịp tim trong vùng an toàn';
        } else {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
        }

        return {
            danh_gia_chi_tiet: danhGia,
            muc_do: mucDo,
            noi_dung_canh_bao: noiDungCanhBao,
            max_heart_rate: maxHeartRate,
            target_zone: targetZone
        };
    }
}

module.exports = nhipTim;