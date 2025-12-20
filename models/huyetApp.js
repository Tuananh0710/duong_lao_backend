const connection= require('../config/database')

class huyetAp{
    static async create(data){
        try {
            const {
                id_benh_nhan,
                tam_thu,
                tam_truong,
                danh_gia_chi_tiet,
                thoi_gian_do,
                vi_tri_do,
                tu_the_khi_do,
                ghi_chu,
                muc_do,
                noi_dung_canh_bao
            }=data;
            const query= `
            INSERT INTO huyet_ap 
                (id_benh_nhan, tam_thu, tam_truong, danh_gia_chi_tiet, thoi_gian_do, 
                 vi_tri_do, tu_the_khi_do, ghi_chu, muc_do, noi_dung_canh_bao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const value = [
                id_benh_nhan ,
                tam_thu,
                tam_truong ,
                danh_gia_chi_tiet || null,
                thoi_gian_do || new Date(),
                vi_tri_do ,
                tu_the_khi_do ,
                ghi_chu || null,
                muc_do || null,
                noi_dung_canh_bao || null
            ];
            const result = await connection.execute(query,value);
            return result;
        } catch (error) {
            console.error('Lỗi khi thêm dữ liệu huyết áp:', error);
            throw new Error('Không thể thêm dữ liệu huyết áp');
        }
    };

    static async findById(id){
        try {
            const query=`
            SELECT ha.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM huyet_ap ha
                LEFT JOIN benh_nhan bn ON ha.id_benh_nhan = bn.id
                WHERE ha.id_benh_nhan = ?
                ORDER BY ha.thoi_gian_do DESC
            `;
            const [rows]= await connection.execute(query,[id]);
            return rows;
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu huyết áp theo ID:', error);
            throw new Error('Không thể lấy dữ liệu huyết áp');
        }
    };

    static async findLastestById(id){
        try {
            const query=`
            SELECT ha.*, bn.ho_ten, bn.ngay_sinh, bn.gioi_tinh
                FROM huyet_ap ha
                LEFT JOIN benh_nhan bn ON ha.id_benh_nhan = bn.id
                WHERE ha.id_benh_nhan = ?
                ORDER BY ha.thoi_gian_do DESC
                LIMIT 1
            `;
            const [rows]= await connection.execute(query,[id]);
            return rows[0] || null
            } catch (error) {
            console.error('Lỗi khi lấy dữ liệu huyết áp gần nhất:', error);
            throw new Error('Không thể lấy dữ liệu huyết áp gần nhất');
        }
    };
    static evaluateBloodPressure(tamThu, tamTruong) {
        let danhGia = 'binh_thuong';
        let mucDo = 'binh_thuong';
        let noiDungCanhBao = null;

        // Đánh giá theo tiêu chuẩn
        if (tamThu >= 180 || tamTruong >= 120) {
            danhGia = 'cao_nang';
            mucDo = 'nguy_hiem';
            noiDungCanhBao = 'Huyết áp rất cao - Cần can thiệp y tế ngay lập tức';
        } else if (tamThu >= 160 || tamTruong >= 100) {
            danhGia = 'cao_vua';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Huyết áp cao - Cần theo dõi chặt chẽ';
        } else if (tamThu >= 140 || tamTruong >= 90) {
            danhGia = 'cao_nhe';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Huyết áp tăng nhẹ';
        } else if (tamThu < 90 || tamTruong < 60) {
            danhGia = 'thap';
            mucDo = 'canh_bao';
            noiDungCanhBao = 'Huyết áp thấp - Cần theo dõi';
        } else {
            danhGia = 'binh_thuong';
            mucDo = 'binh_thuong';
        }

        return { danh_gia_chi_tiet: danhGia, muc_do: mucDo, noi_dung_canh_bao: noiDungCanhBao };
    };
}
module.exports=huyetAp