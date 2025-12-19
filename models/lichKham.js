const connection= require('../config/database');

class lichKham{
    static async getLichKhamByBenhNhan(idBenhNhan){
        try {
            const query=`
            SELECT 
                id,
                id_benh_nhan,
                loai_kham,
                bac_si,
                thoi_gian,
                ngay_tao,
                ngay_cap_nhat
            FROM lich_kham
            WHERE id_benh_nhan = ? AND trang_thai = 'cho_kham' AND thoi_gian >= CURDATE()
            `;
            if(!idBenhNhan){
                throw new Error('thieu tham so can thiet');
            }
            const [rows] = await connection.execute(query,[idBenhNhan]);
            
            return rows
        } catch (error) {
            console.error('loi khi lay lich kham:', error);
            throw error;
        }
    }
}
module.exports=lichKham;