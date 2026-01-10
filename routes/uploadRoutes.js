const express = require('express');
const router = express.Router();
const uploadController = require('../controller/uploadController');
const { upload, uploadImage, uploadVideo, uploadMedia } = require('../config/uploadConfig');

// Upload routes
router.post('/upload', 
  upload.single('file'), // File bất kỳ
  uploadController.uploadFile
);

router.post('/upload/multiple',
  upload.array('files', 10), // Tối đa 10 file
  uploadController.uploadMultipleFiles
);

router.post('/upload/image',
  uploadImage.single('image'), // Chỉ ảnh
  uploadController.uploadImage
);

router.post('/upload/video',
  uploadVideo.single('video'), // Chỉ video
  uploadController.uploadVideo
);

router.post('/upload/media',
  uploadMedia.array('media', 5), // Ảnh + video
  uploadController.uploadMultipleFiles
);

// Get files
router.get('/files', uploadController.getFiles);
router.get('/files/info/:filename', uploadController.getFileInfo);

// Serve files
router.get('/files/:type/:filename', uploadController.serveFile); // type: images, videos, documents

// Delete file
router.delete('/files/:type/:filename', uploadController.deleteFile); // type: image, video, document

module.exports = router;