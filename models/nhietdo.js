const connection= require('../config/database');
class nhietDo{
    static async create(data){
        try {
            const {
                id_benh_nhan,
                gia_tri_nhiet_do,
                danh_gia,
                thoi_gian_do,
                vi_tri_do,
                tinh_trang_luc_do,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao
            }=data;
            const query=`
                INSERT INTO nhiet_do 
                (id_benh_nhan, gia_tri_nhiet_do, danh_gia, thoi_gian_do, 
                 vi_tri_do, tinh_trang_luc_do, ghi_chu, muc_do, noi_dung_canh_bao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const value=[
                id_benh_nhan ,
                gia_tri_nhiet_do ,
                danh_gia ,
                thoi_gian_do || new Date(),
                vi_tri_do , 
                tinh_trang_luc_do , 
                ghi_chu || null,
                muc_do || null,
                noi_dung_canh_bao|| null
            ];
            const [result]= await connection.execute(query,value);
            return {
                success: true,
                message: 'Thêm dữ liệu nhiệt độ thành công',
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu nhiệt độ:', error);
            throw new Error('Không thể thêm dữ liệu nhiệt độ: ' + error.message);
        }
    };
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
    static evaluateTemperature(tempCelsius) {
        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;

        // Đánh giá theo tiêu chuẩn y tế
        if (tempCelsius >= 40.0) {
            danhGia = 'sot_rat_cao';
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Sốt rất cao - Cần can thiệp y tế ngay lập tức';
        } else if (tempCelsius >= 39.0) {
            danhGia = 'sot_cao';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Sốt cao - Cần theo dõi chặt chẽ';
        } else if (tempCelsius >= 38.0) {
            danhGia = 'sot_vua';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Sốt vừa - Cần theo dõi';
        } else if (tempCelsius >= 37.5) {
            danhGia = 'sot_nhe';
            mucDo = 'binh_thuong';
            noiDungCanhBao = 'Sốt nhẹ';
        } else if (tempCelsius <= 35.0) {
            danhGia = 'ha_than_nhiet';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Hạ thân nhiệt - Cần theo dõi';
        } else {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
        }

        return { 
            danh_gia: danhGia, 
            muc_do: mucDo, 
            noi_dung_canh_bao: noiDungCanhBao 
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
}
module.exports=nhietDo;