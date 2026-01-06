const connection= require('../config/database');
class Phong{
    static async getAllPhong(id_phan_khu){
        try {
            const querry=
            `
            SELECT * FROM phong
            WHERE id_phan_khu= ? AND da_xoa != 1
            `
            const [result]= await connection.execute(querry,[id_phan_khu]);
            return result;
        } catch (error) {
             console.error('Lỗi khi lấy thông tin các phòng:', error);
            throw new Error('Không thể lấy thông tin các phòng: ' + error.message);
        }
    }
}
module.exports= Phong;