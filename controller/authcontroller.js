const {hashPassword, comparePassword} = require ('../utils/bcrypt');
const {generateToken,verifyToken} = require('../utils/jwt');
const connection = require('../config/database');

const login = async (req, res, next) => {
    try {
        const { so_dien_thoai, email, mat_khau } = req.body;
        
        if ((!so_dien_thoai && !email) || !mat_khau) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập sdt/email hoặc mật khẩu !'
            });
        }
        const query = so_dien_thoai
            ? `SELECT * FROM tai_khoan WHERE so_dien_thoai=? AND da_xoa=0 AND vai_tro != 'nguoi_nha'`
            : `SELECT * FROM tai_khoan WHERE email=? AND da_xoa=0 AND vai_tro != 'nguoi_nha'`;

        const [users] = await connection.execute(query, [so_dien_thoai || email]);
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại hoặc không có quyền truy cập!'
            });
        }
        
        const user = users[0];
        
        if (user.trang_thai !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu',
            });
        }

        const isVerifiedPass = await comparePassword(mat_khau, user.mat_khau);
        
        if (!isVerifiedPass) {
            return res.status(401).json({
                success: false,
                message: 'Sai mật khẩu !'
            });
        }

        let hoSoNhanVien = null;
        if (user.vai_tro !== 'nguoi_nha') { 
            const [hoSoResult] = await connection.execute(
                `SELECT id AS id_nhan_vien FROM ho_so_nhan_vien WHERE id_tai_khoan = ?`,
                [user.id]
            );
            
            if (hoSoResult.length > 0) {
                hoSoNhanVien = hoSoResult[0];
            }
        }

        const token = generateToken(user.id);

        delete user.mat_khau;

        const responseData = {
            success: true,
            message: 'Đăng nhập thành công !',
            token,
            user: {
                ...user,
                ho_so_nhan_vien: hoSoNhanVien
            }
        };

        res.json(responseData);
        
    } catch (error) {
        next(error);
    }
};

const getProfile= async(req,res,next) => {
    try {
        const [users]=await connection.execute(
            `SELECT id, ho_ten, so_dien_thoai, email, avatar, vai_tro, trang_thai, ngay_tao
            FROM tai_khoan WHERE id=? AND da_xoa=0`,
            [req.user.id]
        )
        if(users.length === 0 ){
            return res.status(401).json({
                success: false,
                message:"Taì khỏan không tồn tại"
            });
        }
        res.json({
            success: true,
            message:"lấy ds user thành công !",
            ...users[0]
        })
    } catch (error) {
        next(error);
    }
};

const loginNguoiNha = async (req, res, next) => {
    try {
        const { so_dien_thoai, email, mat_khau } = req.body;
        
        if ((!so_dien_thoai && !email) || !mat_khau) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập sdt/email và mật khẩu!'
            });
        }

        const query = so_dien_thoai
            ? `SELECT * FROM tai_khoan WHERE so_dien_thoai=? AND da_xoa=0`
            : `SELECT * FROM tai_khoan WHERE email=? AND da_xoa=0`;

        const [users] = await connection.execute(query, [so_dien_thoai || email]);
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại!'
            });
        }
        
        const user = users[0];
        
        if (user.vai_tro !== 'super_admin' && user.vai_tro !== 'nguoi_nha') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản không có quyền truy cập app người nhà!'
            });
        }
        
        if (user.trang_thai !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu',
            });
        }

        const isVerifiedPass = await comparePassword(mat_khau, user.mat_khau);
        
        if (!isVerifiedPass) {
            return res.status(401).json({
                success: false,
                message: 'Sai mật khẩu!'
            });
        }

        let thongTinBoSung = null;
        
        if (user.vai_tro === 'nguoi_nha') {
            const [nguoiThanList] = await connection.execute(
                `SELECT id AS id_nguoi_than FROM nguoi_than_benh_nhan 
                 WHERE id_tai_khoan = ?`,
                [user.id]
            );
            
            if (nguoiThanList.length > 0) {
                thongTinBoSung = {
                    ...nguoiThanList[0]
                };
            }
        }
        const token = generateToken(user.id);

        delete user.mat_khau;

        // Chuẩn bị dữ liệu trả về
        const responseData = {
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            user: {
                ...user,
                ...thongTinBoSung
            }
        };

        res.json(responseData);
        
    } catch (error) {
        next(error);
    }
};

module.exports={
    login,
    getProfile,
    loginNguoiNha
}