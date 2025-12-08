const connection = require('../config/database');

class ThongBao{
    static async getByType(type,limit=20,offset=0){
        try {
            const query=`
            SELECT id, id_nguoi_nhan, tieu_de, noi_dung, link, ngay_tao, ngay_cap_nhat 
            FROM thong_bao 
            WHERE loai = ?
            ORDER BY ngay_tao DESC LIMIT ? OFFSET ?
            `;
            const [rows]= await connection.execute(query,[type,parseInt(limit),parseInt(offset)]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    static async getById(id){
        try{
            const query=`
            SELECT * FROM thong_bao WHERE id = ? 
            `;
            const [rows]= await connection.execute(query,[id]);
            return rows[0] || null;
        }
        catch (error) {
            throw error;
        }
    }

    static async countByType(loai){
        try {
            const [rows]= await connection.execute(`SELECT COUNT(*) as tong_so FROM thong_bao where loai = ?`,[loai]);
            return rows[0].tong_so;
        } catch (error) {
            throw error;
        }
    }
}
module.exports = ThongBao;