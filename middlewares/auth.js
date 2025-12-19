const jwt= require('jsonwebtoken');
const connection= require('../config/database');
const authenticate= async(req,res,next)=>{
    try {
         const token = req.headers.authorization?.split(' ')[1];
         if(!token){
            return res.status(401).json({
                success: false,
                messsage: "Không  có token xác thực"
            });
        }
        const decode= jwt.verify(token,process.env.JWT_SECRET);

        const [users] =await connection.execute(`
            SELECT id, vai_tro, trang_thai FROM tai_khoan WHERE id= ? AND da_xoa=0`,[decode.userId]);
        
        if(users.length===0){
            return res.status(401).json({
                success:false,
                messsage:'Tài khoản khong tồn tại'
            });
        }
        if(users[0].trang_thai !== 'active'){
            return res.status(401).json({
                success: false,
                messsage:'Tài khoản đã bị khóa hoặc vô hiệu'
            });
        }
        req.user={
            id: decode.userId,
            vai_tro:users[0].vai_tro
        };
        next();
    } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token đã hết hạn' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Token không hợp lệ' 
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
module.exports={
    authenticate,
    authorize,
    checkAppPermission
}
