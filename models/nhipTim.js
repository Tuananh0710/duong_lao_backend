const connection= require ('../config/database');
class nhipTim{
    static async create(data){
        try {
            const {
                id_benh_nhan,
                gia_tri_nhip_tim,
                danh_gia_chi_tiet,
                thoi_gian_do,
                tinh_trang_benh_nhan_khi_do,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao
            }=data;
            const query=`
            INSERT INTO nhip_tim 
                (id_benh_nhan, gia_tri_nhip_tim, danh_gia_chi_tiet, thoi_gian_do, 
                 tinh_trang_benh_nhan_khi_do, ghi_chu, muc_do, noi_dung_canh_bao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const value=[
                id_benh_nhan ,
                gia_tri_nhip_tim ,
                danh_gia_chi_tiet || null,
                thoi_gian_do || new Date(),
                tinh_trang_benh_nhan_khi_do,
                ghi_chu || null,
                muc_do || null,
                noi_dung_canh_bao || null
            ];
            // Đảm bảo không có undefined trong values
            const sanitizedValues = value.map(v => v === undefined ? null : v);
            const [result] = await connection.execute(query, sanitizedValues);
            // Lấy record vừa tạo bằng ID
            const queryGet = `
                SELECT nt.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhip_tim nt
                LEFT JOIN benh_nhan bn ON nt.id_benh_nhan = bn.id
                WHERE nt.id = ?
            `;
            const [newRecord] = await connection.execute(queryGet, [result.insertId]);
            return {
                success: true,
                message: 'Thêm dữ liệu nhịp tim thành công',
                data: newRecord[0] || null
            };
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu nhịp tim:', error);
            throw new Error('Không thể thêm dữ liệu nhịp tim: ' + error.message);
        }
    };
    static async findById(id){
        try {
            const query=`
            SELECT nt.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhip_tim nt
                LEFT JOIN benh_nhan bn ON nt.id_benh_nhan = bn.id
                WHERE nt.id_benh_nhan = ?
            `;
            const [rows]= await connection.execute(query,[id]);
            return rows;
        } catch (error) {
             console.error('Lỗi khi lấy dữ liệu nhịp tim theo ID:', error);
            throw new Error('Không thể lấy dữ liệu nhịp tim: ' + error.message);
        }
    };
    static async findLastestByBenhNhan(idBenhNhan){
        try {
            const query = `
                SELECT nt.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM nhip_tim nt
                LEFT JOIN benh_nhan bn ON nt.id_benh_nhan = bn.id
                WHERE nt.id_benh_nhan = ?
                ORDER BY nt.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows]= await connection.execute(query,[idBenhNhan]);
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
    static evaluateHeartRate(heartRate) {
        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;

        if (heartRate < 60) {
            danhGia = 'cham';
            if (heartRate < 50) {
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Nhịp tim chậm - Cần theo dõi';
            } else {
                mucDo = 'binh_thuong';
            }
        } else if (heartRate > 100) {
            danhGia = 'nhanh';
            if (heartRate > 120) {
                mucDo = 'canh_bao';
                noiDungCanhBao = 'Nhịp tim nhanh - Cần theo dõi';
            } else {
                mucDo = 'binh_thuong';
            }
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
}
module.exports=nhipTim;