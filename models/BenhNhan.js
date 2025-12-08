const connection= require('../config/database');

class BenhNhan{
    static async getTongSoBenhNhan(){
        try {
            const [rows] =await connection.query(
                `SELECT COUNT(*) as tong_so
                FROM benh_nhan
                WHERE da_xoa = 0
                `);
                return rows[0].tong_so;
        } catch (error) {
            throw error;
        }
    };
    static async getDsBenhNhan(page = 1, limit = 10, search= ' '){
        try{
            const offset=(page-1)*limit;
            let query=`
            SELECT * FROM benh_nhan WHERE da_xoa=0
            `;
            const params=[];
            if(search){
                query+=' AND (ho_ten LIKE ? OR phong LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm,searchTerm);
            }

            query+= `ORDER BY ngay_nhap_vien DESC LIMIT ? OFFSET ?`;
            params.push(limit,offset);

            const [rows]=await connection.query(query,params);
            
            let countQuery= `SELECT COUNT(*) as tong_so FROM benh_nhan WHERE da_xoa=0`;
            const countParams=[];
            if(search){
                query+=' AND (ho_ten LIKE ? OR phong LIKE ?)';
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm,searchTerm);
            }
            const [countRows]= await connection.query(countQuery,countParams);
            const total= countRows[0].tong_so;
            const totalPages= Math.ceil(total/limit);

            return{
                data: rows,
                pagination:{
                    page:parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages
                }
            }
        }catch(error){
            throw error;
        }
    };
    static async getThongTinChiTietBenhNhan(id) {
    try {
        const [rows] = await connection.query(
            `
            SELECT
                bn.*,
                hs.tien_su_benh,
                hs.di_ung_thuoc,
                hs.lich_su_phau_thuat,
                hs.benh_ly_hien_tai,
                nt.ho_ten as nguoi_than_ho_ten,
                nt.moi_quan_he as nguoi_than_moi_quan_he,
                nt.so_dien_thoai as nguoi_than_so_dien_thoai,
                nt.email as nguoi_than_email
            FROM benh_nhan bn
            LEFT JOIN ho_so_y_te_benh_nhan hs ON hs.id_benh_nhan = bn.id
            LEFT JOIN nguoi_than_benh_nhan nt ON nt.id_benh_nhan = bn.id 
                AND nt.la_nguoi_lien_he_chinh = 1
            WHERE bn.id = ? AND bn.da_xoa = 0
            `, [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
}
}
module.exports = BenhNhan