const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục upload nếu chưa tồn tại
const uploadDirs = {
  images: 'public/uploads/images',
  videos: 'public/uploads/videos',
  documents: 'public/uploads/documents',
  temp: 'public/uploads/temp'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Cấu hình storage động theo loại file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'public/uploads';
    
    // Phân loại thư mục dựa trên mimetype
    if (file.mimetype.startsWith('image/')) {
      uploadPath = uploadDirs.images;
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath = uploadDirs.videos;
    } else {
      uploadPath = uploadDirs.documents;
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất: timestamp-random-originalname
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    
    // Giới hạn độ dài tên file
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    cb(null, `${safeName}_${uniqueName}${ext}`);
  }
});

// Lọc file cho cả ảnh và video
const fileFilter = (req, file, cb) => {
  // Danh sách mimetype cho phép
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword'];
  
  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedDocumentTypes];
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Loại file không được hỗ trợ. Chỉ chấp nhận: ảnh (${allowedImageTypes.join(', ')}) và video (${allowedVideoTypes.join(', ')})`));
  }
};

// Cấu hình với giới hạn kích thước khác nhau
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB cho cả ảnh và video
    files: 10 // Tối đa 10 file cùng lúc
  }
});

// Cấu hình riêng cho ảnh (kích thước nhỏ hơn)
const uploadImage = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDirs.images);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `img_${uniqueName}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const isValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isValidMime = allowedTypes.test(file.mimetype);
    
    if (isValidMime && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB cho ảnh
  }
});

// Cấu hình riêng cho video
const uploadVideo = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDirs.videos);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `video_${uniqueName}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mpeg|avi|mkv|mov|wmv/;
    const isValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isValidMime = /video\/*/.test(file.mimetype);
    
    if (isValidMime && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file video'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB cho video
  }
});

// Cấu hình hỗn hợp (ảnh + video)
const uploadMedia = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh hoặc video'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

module.exports = {
  upload,          // Tất cả file types
  uploadImage,     // Chỉ ảnh
  uploadVideo,     // Chỉ video
  uploadMedia,     // Ảnh + video
  uploadDirs       // Thư mục upload
};