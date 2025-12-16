const connection= require('../config/database');

class sp02{
    static async create(data){
        try {
            const {
                id_benh_nhan,
                gia_tri_spo2,
                thoi_gian_do,
                vi_tri_do,
                tinh_trang_ho_hap,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao
            }= data;
            const query = `
                INSERT INTO spo2 
                (id_benh_nhan, gia_tri_spo2, thoi_gian_do, 
                 vi_tri_do, tinh_trang_ho_hap, ghi_chu, muc_do, noi_dung_canh_bao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [
                id_benh_nhan || null,
                gia_tri_spo2 || null,
                thoi_gian_do || new Date(),
                vi_tri_do || 'ngon_tay_tro', 
                tinh_trang_ho_hap || 'binh_thuong',
                ghi_chu || null,
                muc_do || null,
                noi_dung_canh_bao || null
            ];
            const [result] = await connection.execute(query,values);
            const newRecord = await this.findById(result.insertId);
             return {
                success: true,
                message: 'Thêm dữ liệu SpO2 thành công',
                ...newRecord
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu SpO2:', error);
            throw new Error('Không thể thêm dữ liệu SpO2: ' + error.message);

        }
    }
    static async findById(id) {
        try {
            const query = `
                SELECT s.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM spo2 s
                LEFT JOIN benh_nhan bn ON s.id_benh_nhan = bn.id
                WHERE s.id = ?
            `;
            const [rows] = await connection.execute(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu SpO2 theo ID:', error);
            throw new Error('Không thể lấy dữ liệu SpO2: ' + error.message);
        }
    } 
     static async findByBenhNhan(idBenhNhan, filters = {}) {
        try {
            let query = `
                SELECT s.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM spo2 s
                LEFT JOIN benh_nhan bn ON s.id_benh_nhan = bn.id
                WHERE s.id_benh_nhan = ?
            `;
            
            const values = [idBenhNhan];

            if (filters.from_date) {
                query += ' AND DATE(s.thoi_gian_do) >= ?';
                values.push(filters.from_date);
            }

            if (filters.to_date) {
                query += ' AND DATE(s.thoi_gian_do) <= ?';
                values.push(filters.to_date);
            }

            if (filters.vi_tri_do) {
                query += ' AND s.vi_tri_do = ?';
                values.push(filters.vi_tri_do);
            }

            if (filters.tinh_trang_ho_hap) {
                query += ' AND s.tinh_trang_ho_hap = ?';
                values.push(filters.tinh_trang_ho_hap);
            }

            query += ' ORDER BY s.thoi_gian_do DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                values.push(parseInt(filters.limit));
            }

            const [rows] = await connection.execute(query, values);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu SpO2 theo bệnh nhân:', error);
            throw new Error('Không thể lấy dữ liệu SpO2 của bệnh nhân: ' + error.message);
        }
    }
    static async findLatestByBenhNhan(idBenhNhan) {
        try {
            const query = `
                SELECT s.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM spo2 s
                LEFT JOIN benh_nhan bn ON s.id_benh_nhan = bn.id
                WHERE s.id_benh_nhan = ?
                ORDER BY s.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows] = await connection.execute(query, [idBenhNhan]);
            return rows[0] || null;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu SpO2 gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu SpO2 gần nhất: ' + error.message);
        }
    }
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

            const query = `UPDATE spo2 SET ${fields.join(', ')} WHERE id = ?`;
            
            const [result] = await connection.execute(query, values);
            
            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để cập nhật' };
            }

            const updatedRecord = await this.findById(id);
            
            return {
                success: true,
                message: 'Cập nhật dữ liệu SpO2 thành công',
                data: updatedRecord
            };
        } catch (error) {
            console.error('Lỗi khi cập nhật dữ liệu SpO2:', error);
            throw new Error('Không thể cập nhật dữ liệu SpO2: ' + error.message);
        }
    }
    static async delete(id) {
        try {
            const query = 'DELETE FROM spo2 WHERE id = ?';
            const [result] = await connection.execute(query, [id]);
            
            if (result.affectedRows === 0) {
                return { success: false, message: 'Không tìm thấy bản ghi để xóa' };
            }

            return {
                success: true,
                message: 'Xóa dữ liệu SpO2 thành công',
                affectedRows: result.affectedRows
            };
        } catch (error) {
            console.error('Lỗi khi xóa dữ liệu SpO2:', error);
            throw new Error('Không thể xóa dữ liệu SpO2: ' + error.message);
        }
    }
    static evaluateSpO2(spo2Value, hasRespiratorySymptoms = false) {
        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;
        let tinh_trang_ho_hap = 'binh_thuong';

        // Đánh giá theo tiêu chuẩn y tế
        if (spo2Value >= 95 && spo2Value <= 100) {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
            tinh_trang_ho_hap = 'binh_thuong';
        } else if (spo2Value >= 93 && spo2Value <= 94) {
            danhGia = 'nhe';
            mucDo = 'canh_bao';
            tinh_trang_ho_hap = hasRespiratorySymptoms ? 'kho_tho' : 'binh_thuong';
            noiDungCanhBao = 'SpO2 giảm nhẹ - Cần theo dõi';
        } else if (spo2Value >= 90 && spo2Value <= 92) {
            danhGia = 'trung_binh';
            mucDo = 'canh_bao';
            tinh_trang_ho_hap = 'kho_tho';
            noiDungCanhBao = 'Thiếu oxy máu - Cần thở oxy hỗ trợ';
        } else if (spo2Value >= 85 && spo2Value <= 89) {
            danhGia = 'nang';
            mucDo = 'nguy_hiem';
            tinh_trang_ho_hap = 'tho_nhanh';
            noiDungCanhBao = 'Thiếu oxy máu nặng - Cần can thiệp y tế';
        } else if (spo2Value < 85) {
            danhGia = 'rat_nang';
            mucDo = 'nguy_hiem';
            tinh_trang_ho_hap = 'ngung_tho';
            noiDungCanhBao = 'SpO2 rất thấp - Nguy cơ ngừng thở, cần cấp cứu ngay';
        } else if (spo2Value > 100) {
            danhGia = 'bat_thuong';
            mucDo = 'canh_bao';
            tinh_trang_ho_hap = 'binh_thuong';
            noiDungCanhBao = 'Giá trị SpO2 không hợp lệ (>100%)';
        }

        if (hasRespiratorySymptoms && spo2Value < 95) {
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Có triệu chứng hô hấp kèm SpO2 thấp - Cần đánh giá khẩn cấp';
        }

        return { 
            danh_gia: danhGia, 
            muc_do: mucDo, 
            noi_dung_canh_bao: noiDungCanhBao,
            tinh_trang_ho_hap: tinh_trang_ho_hap
        };
    }
}
module.exports=sp02;