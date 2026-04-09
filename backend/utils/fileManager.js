/**
 * File Management Utilities
 */

const fs = require('fs');
const path = require('path');

/**
 * Delete file safely
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.warn(`Failed to delete file ${filePath}:`, error.message);
  }
  return false;
}

/**
 * Get file size in MB
 */
function getFileSizeMB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / (1024 * 1024)).toFixed(2);
  } catch (error) {
    return null;
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Generate unique filename with convention: timestamp_code_type_uuid
 */
function generateFilename(subjectCode, fileType, originalExtension) {
  const timestamp = Date.now();
  const uuid = Math.random().toString(36).substring(7);
  return `${timestamp}_${subjectCode}_${fileType}_${uuid}${originalExtension}`;
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Clean up old files (keep last N files of each type)
 */
function cleanupOldFiles(subjectId, fileType, outputDir, keepCount = 5) {
  try {
    if (!fs.existsSync(outputDir)) return;

    const files = fs.readdirSync(outputDir)
      .filter(f => f.includes(fileType))
      .map(f => ({
        name: f,
        path: path.join(outputDir, f),
        time: fs.statSync(path.join(outputDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    // Delete files beyond keepCount
    for (let i = keepCount; i < files.length; i++) {
      deleteFile(files[i].path);
    }
  } catch (error) {
    console.warn('Cleanup error:', error.message);
  }
}

module.exports = {
  deleteFile,
  getFileSizeMB,
  fileExists,
  generateFilename,
  ensureDir,
  cleanupOldFiles
};
