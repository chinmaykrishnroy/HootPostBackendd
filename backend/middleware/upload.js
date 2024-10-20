import multer from 'multer';

// Set up multer to handle file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
  fileFilter: (req, file, cb) => {
    return cb(null, true);
  }
});

export default upload;
