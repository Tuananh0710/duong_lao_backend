const path = require('path');
const fs = require('fs');
const { uploadDirs } = require('../config/uploadConfig');

class UploadController {
  
  // Upload file hỗn hợp (cả ảnh và video)
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file để upload'
        });
      }

      // Xác định loại file
      const isImage = req.file.mimetype.startsWith('image/');
      const isVideo = req.file.mimetype.startsWith('video/');
      const fileType = isImage ? 'image' : isVideo ? 'video' : 'document';

      // Tạo URL dựa trên loại file
      let fileUrl;
      if (isImage) {
        fileUrl = `/uploads/images/${req.file.filename}`;
      } else if (isVideo) {
        fileUrl = `/uploads/videos/${req.file.filename}`;
      } else {
        fileUrl = `/uploads/documents/${req.file.filename}`;
      }

      const fileInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: fileType,
        url: fileUrl,
        path: req.file.path,
        uploadedAt: new Date()
      };

      return res.status(200).json({
        success: true,
        message: `Upload ${fileType} thành công`,
        data: fileInfo
      });
    } catch (error) {
      console.error('Lỗi upload file:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload file'
      });
    }
  }

  // Upload nhiều file hỗn hợp
  async uploadMultipleFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một file'
        });
      }

      const uploadedFiles = req.files.map(file => {
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        const fileType = isImage ? 'image' : isVideo ? 'video' : 'document';

        let fileUrl;
        if (isImage) {
          fileUrl = `/uploads/images/${file.filename}`;
        } else if (isVideo) {
          fileUrl = `/uploads/videos/${file.filename}`;
        } else {
          fileUrl = `/uploads/documents/${file.filename}`;
        }

        return {
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          type: fileType,
          url: fileUrl,
          path: file.path,
          uploadedAt: new Date()
        };
      });

      // Thống kê
      const stats = {
        total: uploadedFiles.length,
        images: uploadedFiles.filter(f => f.type === 'image').length,
        videos: uploadedFiles.filter(f => f.type === 'video').length,
        documents: uploadedFiles.filter(f => f.type === 'document').length
      };

      return res.status(200).json({
        success: true,
        message: `Upload thành công ${stats.total} file (${stats.images} ảnh, ${stats.videos} video, ${stats.documents} document)`,
        data: uploadedFiles,
        stats: stats
      });
    } catch (error) {
      console.error('Lỗi upload nhiều file:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload file'
      });
    }
  }

  // Upload chỉ video
  async uploadVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn video để upload'
        });
      }

      // Lấy thông tin video cơ bản
      const videoInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: 'video',
        url: `/uploads/videos/${req.file.filename}`,
        path: req.file.path,
        duration: null, // Có thể thêm duration nếu dùng ffmpeg
        dimensions: null, // Có thể thêm dimensions nếu dùng ffmpeg
        uploadedAt: new Date()
      };

      return res.status(200).json({
        success: true,
        message: 'Upload video thành công',
        data: videoInfo
      });
    } catch (error) {
      console.error('Lỗi upload video:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload video'
      });
    }
  }

  // Upload chỉ ảnh
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ảnh để upload'
        });
      }

      const imageInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: 'image',
        url: `/uploads/images/${req.file.filename}`,
        path: req.file.path,
        uploadedAt: new Date()
      };

      return res.status(200).json({
        success: true,
        message: 'Upload ảnh thành công',
        data: imageInfo
      });
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi upload ảnh'
      });
    }
  }

  // Xóa file (ảnh hoặc video)
  async deleteFile(req, res) {
    try {
      const { filename, type } = req.params;
      
      // Xác định đường dẫn dựa trên loại file
      let filePath;
      if (type === 'image') {
        filePath = path.join(uploadDirs.images, filename);
      } else if (type === 'video') {
        filePath = path.join(uploadDirs.videos, filename);
      } else if (type === 'document') {
        filePath = path.join(uploadDirs.documents, filename);
      } else {
        // Tìm file trong tất cả thư mục
        const allDirs = [uploadDirs.images, uploadDirs.videos, uploadDirs.documents];
        for (const dir of allDirs) {
          const tempPath = path.join(dir, filename);
          if (fs.existsSync(tempPath)) {
            filePath = tempPath;
            break;
          }
        }
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      fs.unlinkSync(filePath);

      return res.status(200).json({
        success: true,
        message: 'Xóa file thành công'
      });
    } catch (error) {
      console.error('Lỗi xóa file:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi xóa file'
      });
    }
  }

  // Lấy danh sách file theo loại
  async getFiles(req, res) {
    try {
      const { type } = req.query; // 'image', 'video', 'document' hoặc 'all'
      
      let files = [];
      let directories = [];

      if (!type || type === 'all') {
        directories = [uploadDirs.images, uploadDirs.videos, uploadDirs.documents];
      } else if (type === 'image') {
        directories = [uploadDirs.images];
      } else if (type === 'video') {
        directories = [uploadDirs.videos];
      } else if (type === 'document') {
        directories = [uploadDirs.documents];
      }

      for (const dir of directories) {
        if (fs.existsSync(dir)) {
          const dirFiles = fs.readdirSync(dir)
            .filter(file => {
              // Bỏ qua file ẩn
              if (file.startsWith('.')) return false;
              
              // Lọc theo loại nếu cần
              if (type && type !== 'all') {
                const ext = path.extname(file).toLowerCase();
                if (type === 'image') {
                  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
                } else if (type === 'video') {
                  return ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.mpeg'].includes(ext);
                } else if (type === 'document') {
                  return ['.pdf', '.doc', '.docx', '.txt'].includes(ext);
                }
              }
              return true;
            })
            .map(file => {
              const filePath = path.join(dir, file);
              const fileType = dir.includes('images') ? 'image' : 
                              dir.includes('videos') ? 'video' : 'document';
              let url;
              
              if (fileType === 'image') {
                url = `/uploads/images/${file}`;
              } else if (fileType === 'video') {
                url = `/uploads/videos/${file}`;
              } else {
                url = `/uploads/documents/${file}`;
              }

              const stats = fs.statSync(filePath);
              
              return {
                filename: file,
                type: fileType,
                url: url,
                path: filePath,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
              };
            });

          files = files.concat(dirFiles);
        }
      }

      // Sắp xếp theo thời gian tạo (mới nhất trước)
      files.sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json({
        success: true,
        data: files,
        total: files.length
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách file:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy danh sách file'
      });
    }
  }

  // Phục vụ file (streaming cho video)
  async serveFile(req, res) {
    try {
      const { type, filename } = req.params;
      
      let filePath;
      if (type === 'images') {
        filePath = path.join(uploadDirs.images, filename);
      } else if (type === 'videos') {
        filePath = path.join(uploadDirs.videos, filename);
      } else if (type === 'documents') {
        filePath = path.join(uploadDirs.documents, filename);
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      // Streaming cho video
      if (type === 'videos') {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
          // Hỗ trợ streaming video
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const file = fs.createReadStream(filePath, { start, end });
          
          const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
          };
          
          res.writeHead(206, head);
          file.pipe(res);
        } else {
          const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
          };
          res.writeHead(200, head);
          fs.createReadStream(filePath).pipe(res);
        }
      } else {
        // Gửi file thông thường cho ảnh và document
        res.sendFile(path.resolve(filePath));
      }
    } catch (error) {
      console.error('Lỗi phục vụ file:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  }

  // Lấy thông tin file
  async getFileInfo(req, res) {
    try {
      const { filename } = req.params;
      
      // Tìm file trong tất cả thư mục
      const allDirs = [uploadDirs.images, uploadDirs.videos, uploadDirs.documents];
      let fileInfo = null;
      let fileType = null;

      for (const dir of allDirs) {
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          
          if (dir.includes('images')) {
            fileType = 'image';
          } else if (dir.includes('videos')) {
            fileType = 'video';
          } else {
            fileType = 'document';
          }

          fileInfo = {
            filename: filename,
            type: fileType,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            path: filePath
          };
          
          if (fileType === 'image') {
            fileInfo.url = `/uploads/images/${filename}`;
          } else if (fileType === 'video') {
            fileInfo.url = `/uploads/videos/${filename}`;
          } else {
            fileInfo.url = `/uploads/documents/${filename}`;
          }
          
          break;
        }
      }

      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      return res.status(200).json({
        success: true,
        data: fileInfo
      });
    } catch (error) {
      console.error('Lỗi lấy thông tin file:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server khi lấy thông tin file'
      });
    }
  }
}

module.exports = new UploadController();