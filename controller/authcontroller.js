const {hashPassword, comparePassword} = require('../utils/bcrypt');
const {generateToken,verifyToken} = require('../utils/jwt');
const connection = require('../config/database');
const { passwordDecrypt } = require('../utils/cryptoHelper'); // Import hàm giải mã

const login = async (req, res, next) => {
    try {
        const { so_dien_thoai, email, mat_khau } = req.body;
        const CRYPTO_KEY = process.env.CRYPTO_KEY || 'encryptionkey'; // KEY giải mã
        
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
        
        // Kiểm tra nếu trạng thái là inactive
        if (user.trang_thai === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Vui lòng đổi mật khẩu để kích hoạt tài khoản',
                code: 'MUST_CHANGE_PASSWORD'
            });
        }
        
        if (user.trang_thai !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu',
            });
        }

        // === PHẦN QUAN TRỌNG: GIẢI MÃ MẬT KHẨU TỪ DATABASE ===
        let decryptedPassword = '';
        try {
            // Giải mã mật khẩu đã mã hóa từ database
            decryptedPassword = passwordDecrypt(user.mat_khau, CRYPTO_KEY);
        } catch (decryptError) {
            console.error('Lỗi giải mã mật khẩu:', decryptError);
            return res.status(500).json({
                success: false,
                message: 'Lỗi xác thực mật khẩu. Vui lòng liên hệ quản trị viên.'
            });
        }

        // So sánh mật khẩu người dùng nhập với mật khẩu đã giải mã
        // Nếu hệ thống cũ lưu mật khẩu không mã hóa bcrypt, so sánh trực tiếp
        const isVerifiedPass = (mat_khau === decryptedPassword);
        
        // HOẶC nếu mật khẩu trong db đã là bcrypt (sau khi migration), dùng comparePassword
        // const isVerifiedPass = await comparePassword(mat_khau, decryptedPassword);

        if (!isVerifiedPass) {
            return res.status(401).json({
                success: false,
                message: 'Sai mật khẩu !'
            });
        }

        let idNhanVien = null;
        if (user.vai_tro !== 'nguoi_nha') { 
            const [hoSoResult] = await connection.execute(
                `SELECT id AS id_nhan_vien FROM ho_so_nhan_vien WHERE id_tai_khoan = ?`,
                [user.id]
            );
            
            if (hoSoResult.length > 0) {
                idNhanVien = hoSoResult[0].id_nhan_vien;
            }
        }

        const tokenPayload = {
            id_tai_khoan: user.id,
            vai_tro: user.vai_tro
        };
        
        if (idNhanVien) {
            tokenPayload.id_nhan_vien = idNhanVien;
        }
        
        const token = generateToken(tokenPayload);

        delete user.mat_khau;

        const responseData = {
            success: true,
            message: 'Đăng nhập thành công !',
            token,
            user: {
                ...user,
                id_nhan_vien: idNhanVien
            }
        };

        res.json(responseData);
        
    } catch (error) {
        next(error);
    }
};

// Cập nhật hàm loginNguoiNha tương tự
const loginNguoiNha = async (req, res, next) => {
    try {
        const { so_dien_thoai, email, mat_khau } = req.body;
        const CRYPTO_KEY = process.env.CRYPTO_KEY || 'encryptionkey';
        
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
        
        // Kiểm tra nếu trạng thái là inactive
        if (user.trang_thai === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Vui lòng đổi mật khẩu để kích hoạt tài khoản',
                code: 'MUST_CHANGE_PASSWORD'
            });
        }
        
        if (user.trang_thai !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu',
            });
        }

        // === GIẢI MÃ MẬT KHẨU TỪ DATABASE ===
        let decryptedPassword = '';
        try {
            decryptedPassword = passwordDecrypt(user.mat_khau, CRYPTO_KEY);
        } catch (decryptError) {
            console.error('Lỗi giải mã mật khẩu:', decryptError);
            return res.status(500).json({
                success: false,
                message: 'Lỗi xác thực mật khẩu. Vui lòng liên hệ quản trị viên.'
            });
        }

        const isVerifiedPass = (mat_khau === decryptedPassword);
        
        if (!isVerifiedPass) {
            return res.status(401).json({
                success: false,
                message: 'Sai mật khẩu!'
            });
        }

        // Migration tự động sang bcrypt
        if (!user.mat_khau.startsWith('$2')) {
            const hashedPassword = await hashPassword(mat_khau);
            await connection.execute(
                'UPDATE tai_khoan SET mat_khau = ?, ngay_cap_nhat = NOW() WHERE id = ?',
                [hashedPassword, user.id]
            );
        }

        let thongTinBoSung = null;
        let tokenPayload = {
            id_tai_khoan: user.id,
            vai_tro: user.vai_tro
        };
        
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
                tokenPayload.id_nguoi_than = nguoiThanList[0].id_nguoi_than;
            }
        }

        const token = generateToken(tokenPayload);

        delete user.mat_khau;

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

// Cập nhật hàm changePassword để xử lý cả mật khẩu mã hóa cũ
const changePassword = async (req, res, next) => {
    try {
        const { so_dien_thoai, email, mat_khau_cu, mat_khau_moi } = req.body;
        const CRYPTO_KEY = process.env.CRYPTO_KEY || 'encryptionkey';

        // Validate input
        if ((!so_dien_thoai && !email) || !mat_khau_cu || !mat_khau_moi) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập sdt/email, mật khẩu cũ và mật khẩu mới'
            });
        }

        // Kiểm tra độ dài mật khẩu mới
        if (mat_khau_moi.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
            });
        }

        // Tìm user
        const query = so_dien_thoai
            ? `SELECT id, mat_khau, trang_thai FROM tai_khoan WHERE so_dien_thoai = ? AND da_xoa = 0`
            : `SELECT id, mat_khau, trang_thai FROM tai_khoan WHERE email = ? AND da_xoa = 0`;

        const [users] = await connection.execute(query, [so_dien_thoai || email]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }

        const user = users[0];

        // Kiểm tra mật khẩu cũ - hỗ trợ cả mật khẩu mã hóa cũ và bcrypt mới
        let isCorrectPassword = false;
        
        // Thử kiểm tra với bcrypt trước
        try {
            isCorrectPassword = await comparePassword(mat_khau_cu, user.mat_khau);
        } catch (bcryptError) {
            // Nếu không phải bcrypt, thử giải mã mật khẩu cũ
            try {
                const decryptedOldPassword = passwordDecrypt(user.mat_khau, CRYPTO_KEY);
                isCorrectPassword = (mat_khau_cu === decryptedOldPassword);
            } catch (decryptError) {
                console.error('Lỗi kiểm tra mật khẩu:', decryptError);
                isCorrectPassword = false;
            }
        }

        if (!isCorrectPassword) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu cũ không chính xác'
            });
        }

        // Mã hóa mật khẩu mới bằng bcrypt
        const hashedPassword = await hashPassword(mat_khau_moi);

        // Cập nhật mật khẩu
        const [result] = await connection.execute(
            `UPDATE tai_khoan 
             SET mat_khau = ?, 
                 trang_thai = 'active',
                 ngay_cap_nhat = NOW()
             WHERE id = ?`,
            [hashedPassword, user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: 'Đổi mật khẩu thất bại'
            });
        }

        // Kiểm tra và thông báo nếu tài khoản được kích hoạt
        let activationMessage = '';
        if (user.trang_thai === 'inactive') {
            activationMessage = 'Tài khoản đã được kích hoạt thành công.';
        }

        res.json({
            success: true,
            message: `Đổi mật khẩu thành công${activationMessage ? ' ' + activationMessage : ''}`,
            data: {
                trang_thai: 'active',
                da_kich_hoat: user.trang_thai === 'inactive'
            }
        });

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

// Hàm helper để kiểm tra định dạng mật khẩu
const isBcryptHash = (password) => {
    return password && password.startsWith('$2');
};

module.exports = {
    login,
    getProfile,
    loginNguoiNha,
    changePassword
};