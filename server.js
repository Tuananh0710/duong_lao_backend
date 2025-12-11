const express= require('express');
const cors= require('cors');
const helmet= require('helmet');
const morgan= require('morgan');
const path= require('path');

require('dotenv').config();

const authRoutes= require('./routes/authRoutes');
const benhNhanRoutes= require('./routes/benhNhanRoutes');
const thongBaoRoutes= require('./routes/thongBaoRoutes');
const lichThamBenhRoutes= require('./routes/lichThamBenh');
const congViecRoutes= require('./routes/congViecRoutes');
const huyetApRoutes= require('./routes/huyetApRoutes');
const nhipTimRoutes= require('./routes/nhipTimRoutes');
const connection=require('./config/database');
const nhietDoRoutes= require('./routes/nhietDoRoutes');
const dashboardRoutes= require('./routes/dashBoardRoutes');
const duongHuyetRoutes=require('./routes/duongHuyetRoutes');
const sp02Routes= require('./routes/sp02Routes');

const {errorHandler,notFound}= require('./middlewares/errorHandler');
const { timeStamp } = require('console');

const app= express();
const PORT=process.env.PORT || 3000;
const NODE_ENV= process.env.NODE_ENV || 'development';

app.use(helmet());

app.use(cors({
    origin:process.env.CLIENT_URL || 'http://localhost:5173',
    credentials:true,
}));

if(NODE_ENV==='development'){
    app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/check', (req,res)=>{
    res.status(200).json({
        success:true,
        message:"server ddang hoat dong",
        timeStamp: new Date().toISOString(),
        environment:NODE_ENV,
        databae: 'connected'
    });
});

app.use('/api/auth',authRoutes);
app.use('/api/benh_nhan', benhNhanRoutes);
app.use('/api/thong_bao',thongBaoRoutes);
app.use('/api/lich_tham_benh',lichThamBenhRoutes);
app.use('/api/cong_viec',congViecRoutes);
app.use('/api/huyet_ap',huyetApRoutes);
app.use('/api/nhip_tim',nhipTimRoutes);
app.use('/api/nhiet_do',nhietDoRoutes);
app.use('/api/dashboard',dashboardRoutes);
app.use('/api/duong_huyet/',duongHuyetRoutes);
app.use('/api/sp02/',sp02Routes);
app.get('/', (req, res) => {
  res.json({
    message: 'Chào mừng đến với API hệ thống Dưỡng Lão',
    version: '1.0.0',
    documentation: 'Xem /check để kiểm tra trạng thái server'
  });
});

app.use(notFound);
app.use(errorHandler);

const startServer= async() =>{
    try {
        await connection.execute('SELECT 1');
        console.log("dtb kết nối thành công");

        app.listen(PORT,()=>{
            console.log(`
                Server is working,
                Port:${PORT},
                Environtmet:${NODE_ENV},
                local: http://localhost:${PORT},
                `)
        });
    } catch (error) {
        console.error('Ko thể khởi động server',error.message);
        console.error('Lỗi: ',error);
        process.exit(1);
        
    }
};
const gracefulShutdown = () => {
  console.log('\n🛑 Nhận tín hiệu shutdown...');
  
  // Lấy server instance từ app.listen
  const server = app.listen(PORT);
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Đóng kết nối database pool
    if (connection.end) {
      connection.end();
      console.log('✅ Database connections closed');
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown sau 10s
  setTimeout(() => {
    console.error('❌ Force shutdown sau 10s');
    process.exit(1);
  }, 10000);
};

// Bắt các tín hiệu shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============ START APPLICATION ============
startServer();