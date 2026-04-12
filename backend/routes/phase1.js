/**
 * Phase 1 Routes - CAT1 Question Paper & Marks
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const { Subject, File, Configuration, IntermediateOutput, ProcessingLog } = require('../models');
const { uploadErrorHandler } = require('../middleware/upload');
const { runStage1, runStage2, runStage3, runStage4 } = require('../utils/pythonExecutor');
const { fileExists, getFileSizeMB, generateFilename, deleteFile } = require('../utils/fileManager');
const { updateSubjectPhase, validatePhaseFiles } = require('../utils/phaseTracker');

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

    // Verify subject ownership
    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
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

    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
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

    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
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

    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
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
