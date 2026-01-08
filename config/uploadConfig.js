const multer = require('multer');
const path= require('path');
const fs= require('fs');

const uploadDirs={
    images: '../uploads/images',
    videos: '../uploads/videos',
    temp: '../uploads/temp'
};
