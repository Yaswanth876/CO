/**
 * Phase 2 Routes - CAT2 and ASS2
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const { Subject, File, Configuration, IntermediateOutput, ProcessingLog } = require('../models');
const { uploadErrorHandler } = require('../middleware/upload');
const { runStage1, runStage2, runStage3, runStage4 } = require('../utils/pythonExecutor');
const { fileExists, getFileSizeMB, deleteFile } = require('../utils/fileManager');
const { updateSubjectPhase } = require('../utils/phaseTracker');

/**
 * POST /api/phase2/upload
 * Upload CAT2 QP, CAT2 Marks, or ASS2
 */
router.post('/upload', uploadErrorHandler, async (req, res, next) => {
  try {
    const { subject_id, file_type } = req.body;
    const userId = req.user.id;

    if (!subject_id || !file_type || !req.file) {
      return res.status(400).json({ error: 'Subject ID, file type, and file required' });
    }

    const validTypes = ['CAT2_QP', 'CAT2_MARKS', 'ASS2'];
    if (!validTypes.includes(file_type)) {
      return res.status(400).json({ error: `Invalid file type. Must be one of: ${validTypes.join(', ')}` });
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
      file_type,
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
 * POST /api/phase2/process
 * Process mid-sem files (CAT2 + ASS2) and generate the mid-sem report
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

    const earlyReport = await IntermediateOutput.findOne({
      where: {
        subject_id,
        output_type: { [Op.in]: ['EARLY_SEM_REPORT', 'CAT1_FINAL'] }
      },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (!earlyReport || !fileExists(earlyReport.file_path)) {
      return res.status(400).json({ error: 'Early-sem report must be completed first' });
    }

    const cat2QpFile = await File.findOne({
      where: { subject_id, file_type: 'CAT2_QP' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    const cat2MarksFile = await File.findOne({
      where: { subject_id, file_type: 'CAT2_MARKS' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    const ass2File = await File.findOne({
      where: { subject_id, file_type: 'ASS2' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (!cat2QpFile || !cat2MarksFile || !ass2File) {
      return res.status(400).json({ error: 'CAT2 QP, CAT2 marks, and ASS2 files required' });
    }

    if (!fileExists(cat2QpFile.file_path) || !fileExists(cat2MarksFile.file_path) || !fileExists(ass2File.file_path)) {
      return res.status(400).json({ error: 'Uploaded CAT2 or ASS2 files not found' });
    }

    const log = await ProcessingLog.create({
      subject_id,
      stage_number: 2,
      status: 'started',
      input_files: JSON.stringify([earlyReport.file_path, cat2QpFile.file_path, cat2MarksFile.file_path, ass2File.file_path])
    });

    cat2QpFile.processing_status = 'processing';
    cat2MarksFile.processing_status = 'processing';
    ass2File.processing_status = 'processing';
    await cat2QpFile.save();
    await cat2MarksFile.save();
    await ass2File.save();

    const outputsDir = process.env.OUTPUTS_DIR || './outputs';
    const cat2OutputPath = path.join(outputsDir, `CAT2_FINAL_${subject_id}_${Date.now()}.xlsx`);

    let stage1Result;
    try {
      stage1Result = await runStage1(cat2QpFile.file_path, cat2OutputPath);
    } catch (error) {
      throw new Error(`CAT2 stage 1 failed: ${error.error || error.message}`);
    }

    if (stage1Result.status !== 'ok') {
      throw new Error(`CAT2 stage 1 error: ${stage1Result.message}`);
    }

    let stage2Result;
    try {
      stage2Result = await runStage2(cat2OutputPath, cat2MarksFile.file_path);
    } catch (error) {
      throw new Error(`CAT2 stage 2 failed: ${error.error || error.message}`);
    }

    if (stage2Result.status !== 'ok') {
      throw new Error(`CAT2 stage 2 error: ${stage2Result.message}`);
    }

    cat2QpFile.processing_status = 'success';
    cat2MarksFile.processing_status = 'success';
    await cat2QpFile.save();
    await cat2MarksFile.save();

    await IntermediateOutput.create({
      subject_id,
      stage_number: 2,
      output_type: 'CAT2_FINAL',
      file_path: cat2OutputPath,
      is_latest: true
    });

    const midStage3Input = path.join(outputsDir, `MID_SEM_STAGE3_${subject_id}_${Date.now()}.xlsx`);
    fs.copyFileSync(earlyReport.file_path, midStage3Input);

    let stage3Result;
    try {
      stage3Result = await runStage3({
        phase: 'mid',
        outputPath: midStage3Input,
        cat2Path: cat2OutputPath,
        ass2Path: ass2File.file_path
      });
    } catch (error) {
      throw new Error(`Stage 3 mid failed: ${error.error || error.message}`);
    }

    if (stage3Result.status !== 'ok') {
      throw new Error(`Stage 3 mid error: ${stage3Result.message}`);
    }

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

    const midReportOutput = path.join(outputsDir, `MID_SEM_REPORT_${subject_id}_${Date.now()}.xlsx`);

    let stage4Result;
    try {
      stage4Result = await runStage4({
        phase: 'mid',
        coAttainmentPath: midStage3Input,
        outputPath: midReportOutput,
        ep,
        constraint,
        ela
      });
    } catch (error) {
      throw new Error(`Stage 4 mid failed: ${error.error || error.message}`);
    }

    if (stage4Result.status !== 'ok') {
      throw new Error(`Stage 4 mid error: ${stage4Result.message}`);
    }

    await IntermediateOutput.create({
      subject_id,
      stage_number: 4,
      output_type: 'MID_SEM_REPORT',
      file_path: midReportOutput,
      is_latest: true
    });

    await updateSubjectPhase(subject_id, 2);

    log.status = 'completed';
    log.output_file = midReportOutput;
    log.execution_time_ms = Date.now() - startTime;
    log.completed_at = new Date();
    await log.save();

    res.json({
      status: 'success',
      message: 'Mid-sem report generated',
      output_path: midReportOutput,
      execution_time_ms: log.execution_time_ms
    });
  } catch (error) {
    await ProcessingLog.update(
      {
        status: 'failed',
        error_message: error.message,
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date()
      },
      { where: { subject_id: req.body.subject_id, stage_number: 2, status: 'started' } }
    );

    await File.update(
      {
        processing_status: 'failed',
        processing_error: error.message
      },
      {
        where: {
          subject_id: req.body.subject_id,
          file_type: { [Op.in]: ['CAT2_QP', 'CAT2_MARKS', 'ASS2'] },
          processing_status: 'processing'
        }
      }
    );

    next(error);
  }
});

module.exports = router;
