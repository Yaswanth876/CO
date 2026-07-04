/**
 * Unified Upload Routes
 */

const express = require('express');
const router = express.Router();
const { Subject, File, FacultyCourseAssignment } = require('../models');
const { uploadErrorHandler } = require('../middleware/upload');
const { getFileSizeMB, deleteFile } = require('../utils/fileManager');
const { logActivity } = require('../utils/activityLogger');

async function checkCourseAssignment(userId, role, subjectId) {
  let isAssigned = false;
  if (role === 'admin') {
    isAssigned = true;
  } else {
    const assignment = await FacultyCourseAssignment.findOne({
      where: { faculty_id: userId, course_id: subjectId }
    });
    isAssigned = !!assignment;
  }
  if (!isAssigned) {
    throw new Error('Forbidden');
  }
  const subject = await Subject.findByPk(subjectId);
  if (!subject) {
    throw new Error('NotFound');
  }
  return subject;
}

const handleUpload = (fileType) => async (req, res, next) => {
  try {
    const { subject_id } = req.body;
    const userId = req.user.id;

    if (!subject_id || !req.file) {
      return res.status(400).json({ error: 'Subject ID and file required' });
    }

    try {
      await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    const fileSizeMB = getFileSizeMB(req.file.path);

    const fileRecord = await File.create({
      subject_id,
      file_type: fileType,
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: req.file.path,
      file_size: fileSizeMB,
      uploaded_by: userId,
      processing_status: 'pending'
    });

    await logActivity(userId, 'File Upload', { course_id: subject_id, file_type: fileType });

    res.status(201).json({
      status: 'success',
      file: {
        id: fileRecord.id,
        file_type: fileRecord.file_type,
        stored_filename: fileRecord.stored_filename,
        file_size: fileSizeMB,
        processing_status: 'pending'
      }
    });
  } catch (error) {
    if (req.file) deleteFile(req.file.path);
    next(error);
  }
};

router.post('/cat1', uploadErrorHandler, handleUpload('CAT1_MARKS'));
router.post('/cat2', uploadErrorHandler, handleUpload('CAT2_MARKS'));
router.post('/ass1', uploadErrorHandler, handleUpload('ASS1'));
router.post('/ass2', uploadErrorHandler, handleUpload('ASS2'));
router.post('/terminal', uploadErrorHandler, handleUpload('TERMINAL'));

module.exports = router;
