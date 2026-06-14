/**
 * Phase 1 Routes - CAT1 Question Paper & Marks
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const { Subject, File, Configuration, IntermediateOutput, ProcessingLog, FacultyCourseAssignment, Report } = require('../models');
const { uploadErrorHandler } = require('../middleware/upload');
const { runStage1, runStage2, runStage3, runStage4 } = require('../utils/pythonExecutor');
const { fileExists, getFileSizeMB, generateFilename, deleteFile } = require('../utils/fileManager');
const { updateSubjectPhase, validatePhaseFiles } = require('../utils/phaseTracker');
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

/**
 * POST /api/phase1/upload-qp
 * Upload CAT1 Question Paper (DOCX)
 */
router.post('/upload-qp', uploadErrorHandler, async (req, res, next) => {
  try {
    const { subject_id } = req.body;
    const userId = req.user.id;

    if (!subject_id || !req.file) {
      return res.status(400).json({ error: 'Subject ID and file required' });
    }

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    // Create file record
    const fileSizeMB = getFileSizeMB(req.file.path);

    const fileRecord = await File.create({
      subject_id,
      file_type: 'CAT1_QP',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: req.file.path,
      file_size: fileSizeMB,
      uploaded_by: userId,
      processing_status: 'pending'
    });

    await logActivity(userId, 'Marks Upload', { course_id: subject_id, file_type: 'CAT1_QP' });

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
    // Cleanup file on error
    if (req.file) deleteFile(req.file.path);
    next(error);
  }
});

/**
 * POST /api/phase1/upload-marks
 * Upload CAT1 Marks (XLSX from CAMU)
 */
router.post('/upload-marks', uploadErrorHandler, async (req, res, next) => {
  try {
    const { subject_id } = req.body;
    const userId = req.user.id;

    if (!subject_id || !req.file) {
      return res.status(400).json({ error: 'Subject ID and file required' });
    }

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    const fileSizeMB = getFileSizeMB(req.file.path);

    const fileRecord = await File.create({
      subject_id,
      file_type: 'CAT1_MARKS',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: req.file.path,
      file_size: fileSizeMB,
      uploaded_by: userId,
      processing_status: 'pending'
    });

    await logActivity(userId, 'Marks Upload', { course_id: subject_id, file_type: 'CAT1_MARKS' });

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
});

/**
 * POST /api/phase1/upload-assignment
 * Upload Assignment 1 Marks (XLSX)
 */
router.post('/upload-assignment', uploadErrorHandler, async (req, res, next) => {
  try {
    const { subject_id } = req.body;
    const userId = req.user.id;

    if (!subject_id || !req.file) {
      return res.status(400).json({ error: 'Subject ID and file required' });
    }

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    const fileSizeMB = getFileSizeMB(req.file.path);

    const fileRecord = await File.create({
      subject_id,
      file_type: 'ASS1',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: req.file.path,
      file_size: fileSizeMB,
      uploaded_by: userId,
      processing_status: 'pending'
    });

    await logActivity(userId, 'Marks Upload', { course_id: subject_id, file_type: 'ASS1' });

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
});

/**
 * POST /api/phase1/process
 * Process CAT1 files (run Stage 1 & 2)
 */
router.post('/process', async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { subject_id } = req.body;
    const userId = req.user.id;

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    // Get required files
    const qpFile = await File.findOne({
      where: { subject_id, file_type: 'CAT1_QP' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    const marksFile = await File.findOne({
      where: { subject_id, file_type: 'CAT1_MARKS' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    const ass1File = await File.findOne({
      where: { subject_id, file_type: 'ASS1' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (!qpFile || !marksFile || !ass1File) {
      return res.status(400).json({ error: 'CAT1 QP, CAT1 marks, and ASS1 files required' });
    }

    // Validate files exist
    if (!fileExists(qpFile.file_path) || !fileExists(marksFile.file_path) || !fileExists(ass1File.file_path)) {
      return res.status(400).json({ error: 'Upload files not found' });
    }

    // Log processing start
    const log = await ProcessingLog.create({
      subject_id,
      stage_number: 1,
      status: 'started',
      input_files: JSON.stringify([qpFile.file_path, marksFile.file_path, ass1File.file_path])
    });

    // Stage 1: Parse QP
    qpFile.processing_status = 'processing';
    await qpFile.save();

    const outputsDir = process.env.OUTPUTS_DIR || './outputs';
    const qpOutputPath = path.join(outputsDir, `QP_FINAL_${subject_id}_${Date.now()}.xlsx`);

    let stage1Result;
    try {
      stage1Result = await runStage1(qpFile.file_path, qpOutputPath);
    } catch (error) {
      throw new Error(`Stage 1 failed: ${error.error || error.message}`);
    }

    if (stage1Result.status !== 'ok') {
      throw new Error(`Stage 1 error: ${stage1Result.message}`);
    }

    qpFile.processing_status = 'success';
    await qpFile.save();

    // Stage 2: Inject marks
    marksFile.processing_status = 'processing';
    await marksFile.save();

    let stage2Result;
    try {
      stage2Result = await runStage2(qpOutputPath, marksFile.file_path);
    } catch (error) {
      throw new Error(`Stage 2 failed: ${error.error || error.message}`);
    }

    if (stage2Result.status !== 'ok') {
      throw new Error(`Stage 2 error: ${stage2Result.message}`);
    }

    marksFile.processing_status = 'success';
    await marksFile.save();

    // Save intermediate output
    await IntermediateOutput.create({
      subject_id,
      stage_number: 2,
      output_type: 'CAT1_FINAL',
      file_path: qpOutputPath,
      is_latest: true
    });

    const config = await Configuration.findOne({ where: { subject_id } });
    const ep = parseFloat(config?.ep) || 80;
    const constraint = parseFloat(config?.constraint_value) || 79.99;
    const ela = {
      CO1: parseFloat(config?.ela_co1) || 75,
      CO2: parseFloat(config?.ela_co2) || 75,
      CO3: parseFloat(config?.ela_co3) || 70,
      CO4: parseFloat(config?.ela_co4) || 85,
      CO5: parseFloat(config?.ela_co5) || 80,
      CO6: parseFloat(config?.ela_co6) || 78
    };

    const earlyStage3Path = path.join(outputsDir, `EARLY_SEM_STAGE3_${subject_id}_${Date.now()}.xlsx`);
    const earlyReportPath = path.join(outputsDir, `EARLY_SEM_REPORT_${subject_id}_${Date.now()}.xlsx`);

    let stage3Result;
    try {
      stage3Result = await runStage3({
        phase: 'early',
        cat1Path: qpOutputPath,
        ass1Path: ass1File.file_path,
        outputPath: earlyStage3Path
      });
    } catch (error) {
      throw new Error(`Stage 3 early failed: ${error.error || error.message}`);
    }

    if (stage3Result.status !== 'ok') {
      throw new Error(`Stage 3 early error: ${stage3Result.message}`);
    }

    let stage4Result;
    try {
      stage4Result = await runStage4({
        phase: 'early',
        coAttainmentPath: earlyStage3Path,
        outputPath: earlyReportPath,
        ep,
        constraint,
        ela
      });
    } catch (error) {
      throw new Error(`Stage 4 early failed: ${error.error || error.message}`);
    }

    if (stage4Result.status !== 'ok') {
      throw new Error(`Stage 4 early error: ${stage4Result.message}`);
    }

    await IntermediateOutput.create({
      subject_id,
      stage_number: 4,
      output_type: 'EARLY_SEM_REPORT',
      file_path: earlyReportPath,
      is_latest: true
    });

    // Create Report record
    await Report.create({
      faculty_id: userId,
      course_id: subject_id,
      report_file_path: earlyReportPath,
      report_name: `${subject.subject_code}_EARLY_SEM_REPORT`,
      status: 'Generated',
      generated_at: new Date()
    });

    await logActivity(userId, 'Report Generation', {
      course_id: subject_id,
      report_type: 'Early-sem'
    });

    // Update phase
    await updateSubjectPhase(subject_id, 1);

    // Log completion
    log.status = 'completed';
    log.output_file = earlyReportPath;
    log.execution_time_ms = Date.now() - startTime;
    log.completed_at = new Date();
    await log.save();

    res.json({
      status: 'success',
      message: 'Early-sem report generated',
      output_path: earlyReportPath,
      execution_time_ms: log.execution_time_ms
    });
  } catch (error) {
    // Log error
    await ProcessingLog.update(
      {
        status: 'failed',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date()
      },
      { where: { subject_id: req.body.subject_id, stage_number: 1, status: 'started' } }
    );

    await File.update(
      {
        processing_status: 'failed',
        processing_error: error.message
      },
      {
        where: {
          subject_id: req.body.subject_id,
          file_type: { [Op.in]: ['CAT1_QP', 'CAT1_MARKS'] },
          processing_status: 'processing'
        }
      }
    );

    next(error);
  }
});

module.exports = router;
