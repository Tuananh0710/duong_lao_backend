const connection= require('../config/database');
class Phong{
    static async getAllPhong() {
        try {
            const query = `
            SELECT
                CONCAT(pk.ten_khu, '-', p.so_phong) as ten_phong_day_du
            FROM phong p
            LEFT JOIN phan_khu pk ON pk.id = p.id_phan_khu
            WHERE p.da_xoa = 0 
                AND pk.da_xoa = 0
                AND p.trang_thai = 'trong'
            ORDER BY 
                pk.ten_khu ASC,
                p.so_phong ASC
            `;
            
            const [result] = await connection.execute(query);
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin các phòng:', error);
            throw new Error('Không thể lấy thông tin các phòng: ' + error.message);
        }
    }
}
module.exports= Phong;