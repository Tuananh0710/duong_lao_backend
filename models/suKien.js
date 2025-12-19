const connection=require('../config/database');

class suKien{
    static async getDsSuKien(){
        try {
            const query=`
            SELECT 
                id,
                tieu_de,
                mo_ta,
                ngay,
                dia_diem,
                ngay_tao,
                ngay_cap_nhat
            FROM su_kien WHERE da_xoa != 1 AND ngay >= CURDATE()
            ORDER BY ngay DESC
            LIMIT 10
            `;

            const [rows]=await connection.execute(query);

            return rows;

        } catch (error) {
            console.error('loi khi lay lich su kien:', error);
            throw error;
        }
    }
}
module.exports=suKien;