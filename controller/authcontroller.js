const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { generateToken, verifyToken } = require('../utils/jwt');
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

        // tìm tk
           const query = `
            SELECT 
                tk.*,
                hsnv.id AS id_dieu_duong
            FROM tai_khoan tk
            INNER JOIN ho_so_nhan_vien hsnv 
                ON hsnv.id_tai_khoan = tk.id
            WHERE 
                ${so_dien_thoai ? 'tk.so_dien_thoai = ?' : 'tk.email = ?'}
                AND tk.da_xoa = 0
            LIMIT 1
        `;

        const [users] = await connection.execute(query, [so_dien_thoai || email]);
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'sdt/email hoặc mật khẩu sai!'
            });
        }
        const user = users[0];
        if (user.trang_thai !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'tài khoản đã bị khóa hoặc vô hiệu',
            });
        }
        const isVerifiedPass = await comparePassword(mat_khau, user.mat_khau);
        if (!isVerifiedPass) {
            return res.status(401).json({
                success: false,
                message: 'Sai mật khẩu !'
            });
        }
        const token = generateToken(user.id);

        delete user.mat_khau;

        res.json({
            success: true,
            message: 'Đăng nhập thành công !',
            token,
            user
        });
    } catch (error) {
        next(error);
    }
};
const getProfile = async (req, res, next) => {
    try {
        const [users] = await connection.execute(
            `SELECT id, ho_ten, so_dien_thoai, email, avatar, vai_tro, trang_thai, ngay_tao
            FROM tai_khoan WHERE id=? AND da_xoa=0`,
            [req.user.id]
        )
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Taì khỏan không tồn tại"
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
module.exports = {
    login,
    getProfile,
}