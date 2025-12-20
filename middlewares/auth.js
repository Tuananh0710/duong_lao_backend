const jwt = require('jsonwebtoken');
const connection = require('../config/database');

const authenticate = async(req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if(!token){
            return res.status(401).json({
                success: false,
                message: "Không có token xác thực"
            });
        }
        
        // Giải mã token - giờ decode là object chứa id_tai_khoan, id_nhan_vien, vai_tro
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        
        // Kiểm tra xem token có cấu trúc mới hay cũ
        let idTaiKhoan;
        
        if (decode.id_tai_khoan) {
            // Token mới: decode chứa id_tai_khoan
            idTaiKhoan = decode.id_tai_khoan;
        } else if (decode.userId) {
            // Token cũ: decode chứa userId
            idTaiKhoan = decode.userId;
        } else {
            // Token không hợp lệ
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }

        const [users] = await connection.execute(
            `SELECT id, vai_tro, trang_thai FROM tai_khoan WHERE id= ? AND da_xoa=0`,
            [idTaiKhoan]
        );
        
        if(users.length === 0){
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }
        
        if(users[0].trang_thai !== 'active'){
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc vô hiệu'
            });
        }
        
        // Lưu tất cả thông tin từ token vào req.user
        req.user = {
            id_tai_khoan: idTaiKhoan,
            id_nhan_vien: decode.id_nhan_vien || null,  // Có thể null nếu là super_admin
            id_nguoi_than: decode.id_nguoi_than || null, // Cho người nhà
            vai_tro: decode.vai_tro || users[0].vai_tro, // Ưu tiên từ token
            trang_thai: users[0].trang_thai
        };
        
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token đã hết hạn' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token không hợp lệ' 
            });
        }
        
        console.error('Lỗi xác thực:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi hệ thống xác thực' 
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Chưa xác thực' 
            });
        }

        if (!roles.includes(req.user.vai_tro)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Không có quyền truy cập' 
            });
        }

        next();
    };
};

const checkAppPermission = (appType) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Chưa xác thực' 
            });
        }

        const userRole = req.user.vai_tro;
        
        // Định nghĩa các role được phép vào từng app
        const appPermissions = {
            'nguoi_nha_app': ['nguoi_nha'], // Chỉ người nhà
            'dieu_duong_app': ['super_admin', 'quan_ly_y_te', 'quan_ly_nhan_su', 'dieu_duong', 'dieu_duong_truong', 'marketing'],
            'all': ['super_admin', 'quan_ly_y_te', 'quan_ly_nhan_su', 'dieu_duong', 'dieu_duong_truong', 'nguoi_nha', 'marketing']
        };

        if (!appPermissions[appType]) {
            return res.status(403).json({ 
                success: false, 
                message: 'Loại app không hợp lệ' 
            });
        }

        if (!appPermissions[appType].includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                message: `Tài khoản ${userRole} không có quyền truy cập vào app này` 
            });
        }

        next();
    };
};

// Middleware kiểm tra xem user có phải là nhân viên (có id_nhan_vien)
const isNhanVien = (req, res, next) => {
    if (!req.user.id_nhan_vien) {
        return res.status(403).json({
            success: false,
            message: 'Chức năng này chỉ dành cho nhân viên'
        });
    }
    next();
};

// Middleware kiểm tra xem user có phải là người nhà
const isNguoiNha = (req, res, next) => {
    if (!req.user.id_nguoi_than) {
        return res.status(403).json({
            success: false,
            message: 'Chức năng này chỉ dành cho người nhà'
        });
    }
    next();
};

// Middleware kiểm tra xem user có phải là super_admin
const isSuperAdmin = (req, res, next) => {
    if (req.user.vai_tro !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Chức năng này chỉ dành cho super admin'
        });
    }
    next();
};

module.exports = {
    authenticate,
    authorize,
    checkAppPermission,
    isNhanVien,
    isNguoiNha,
    isSuperAdmin
};