/**
 * File Upload Middleware
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const backendRoot = path.resolve(__dirname, '..');
const uploadsDirSetting = process.env.UPLOADS_DIR || 'uploads';
const uploadsDir = path.isAbsolute(uploadsDirSetting)
  ? uploadsDirSetting
  : path.resolve(backendRoot, uploadsDirSetting);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * File naming convention: timestamp_subjectCode_fileType_uuid
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const subjectCode = req.body.subject_code || 'unknown';
    const fileType = req.body.file_type || 'unknown';
    const uuid = uuidv4().substring(0, 8);
    const ext = path.extname(file.originalname);

    const filename = `${timestamp}_${subjectCode}_${fileType}_${uuid}${ext}`;
    cb(null, filename);
  }
});

/**
 * File filter: only allow .docx and .xlsx files
 */
const fileFilter = (req, file, cb) => {
  const allowed = ['.docx', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Only .docx and .xlsx are allowed. Got: ${ext}`));
  }
};

/**
 * Multer upload configuration
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024  // 50 MB max
  }
});

/**
 * Upload single file middleware
 */
const uploadSingleFile = upload.single('file');

/**
 * Upload error handler wrapper
 */
const uploadErrorHandler = (req, res, next) => {
  uploadSingleFile(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({ error: 'File too large. Max 50MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = {
  uploadErrorHandler,
  uploadsDir
};
