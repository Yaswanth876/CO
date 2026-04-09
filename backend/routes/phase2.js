/**
 * Phase 2 Routes - CAT2, ASS1, ASS2
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { Op } = require('sequelize');

const { Subject, File, IntermediateOutput, ProcessingLog } = require('../models');
const { uploadErrorHandler } = require('../middleware/upload');
const { runStage1, runStage2, runStage3 } = require('../utils/pythonExecutor');
const { fileExists, getFileSizeMB, deleteFile } = require('../utils/fileManager');
const { updateSubjectPhase, validatePhaseFiles } = require('../utils/phaseTracker');

/**
 * POST /api/phase2/upload
 * Upload CAT2 QP, CAT2 Marks, ASS1, or ASS2
 */
router.post('/upload', uploadErrorHandler, async (req, res, next) => {
  try {
    const { subject_id, file_type } = req.body;
    const userId = req.user.id;

    if (!subject_id || !file_type || !req.file) {
      return res.status(400).json({ error: 'Subject ID, file type, and file required' });
    }

    // Validate file_type
    const validTypes = ['CAT2_QP', 'CAT2_MARKS', 'ASS1', 'ASS2'];
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
 * Process Phase 2 files (CAT2 + ASS) - requires template
 */
router.post('/process', async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { subject_id, template_path } = req.body;
    const userId = req.user.id;

    if (!template_path) {
      return res.status(400).json({
        error: 'Template path required',
        details: 'Provide template_path in request body (absolute path to CO template .xlsx)'
      });
    }

    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Verify Phase 1 is complete
    const phase1Output = await IntermediateOutput.findOne({
      where: { subject_id, output_type: 'CAT1_FINAL', is_latest: true }
    });

    if (!phase1Output) {
      return res.status(400).json({ error: 'Phase 1 must be completed first' });
    }

    // Get CAT2 files (process like Phase 1)
    const cat2QpFile = await File.findOne({
      where: { subject_id, file_type: 'CAT2_QP' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    const cat2MarksFile = await File.findOne({
      where: { subject_id, file_type: 'CAT2_MARKS' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (cat2QpFile && cat2MarksFile && fileExists(cat2QpFile.file_path) && fileExists(cat2MarksFile.file_path)) {
      cat2QpFile.processing_status = 'processing';
      cat2MarksFile.processing_status = 'processing';
      await cat2QpFile.save();
      await cat2MarksFile.save();

      // Process CAT2 through Stage 1 & 2
      const outputsDir = process.env.OUTPUTS_DIR || './outputs';
      const cat2QpOutput = path.join(outputsDir, `CAT2_QP_FINAL_${subject_id}_${Date.now()}.xlsx`);

      const stage1 = await runStage1(cat2QpFile.file_path, cat2QpOutput);
      if (stage1.status !== 'ok') throw new Error(`CAT2 Stage 1 failed: ${stage1.message}`);

      cat2QpFile.processing_status = 'success';
      await cat2QpFile.save();

      const stage2 = await runStage2(cat2QpOutput, cat2MarksFile.file_path);
      if (stage2.status !== 'ok') throw new Error(`CAT2 Stage 2 failed: ${stage2.message}`);

      cat2MarksFile.processing_status = 'success';
      await cat2MarksFile.save();

      await IntermediateOutput.update(
        { is_latest: false },
        { where: { subject_id } }
      );

      await IntermediateOutput.create({
        subject_id,
        stage_number: 2,
        output_type: 'CAT2_FINAL',
        file_path: cat2QpOutput
      });
    } else {
      throw new Error('CAT2 QP and Marks files required');
    }

    // Get ASS files
    const ass1File = await File.findOne({
      where: { subject_id, file_type: 'ASS1' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    const ass2File = await File.findOne({
      where: { subject_id, file_type: 'ASS2' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (!ass1File || !ass2File) {
      throw new Error('Both ASS1 and ASS2 files required');
    }

    ass1File.processing_status = 'processing';
    ass2File.processing_status = 'processing';
    await ass1File.save();
    await ass2File.save();

    ass1File.processing_status = 'success';
    ass2File.processing_status = 'success';
    await ass1File.save();
    await ass2File.save();

    // Stage 3: Consolidate all files
    const cat1Output = phase1Output.file_path;
    const cat2Output = await IntermediateOutput.findOne({
      where: { subject_id, output_type: 'CAT2_FINAL', is_latest: true }
    });

    const outputsDir = process.env.OUTPUTS_DIR || './outputs';
    const consolidatedOutput = path.join(outputsDir, `CO_ATTAINMENT_FINAL_${subject_id}_${Date.now()}.xlsx`);

    const stage3 = await runStage3(
      template_path,
      cat1Output,
      cat2Output.file_path,
      ass1File.file_path,
      ass2File.file_path,
      consolidatedOutput
    );

    if (stage3.status !== 'ok') {
      throw new Error(`Stage 3 failed: ${stage3.message}`);
    }

    // Save consolidated output
    await IntermediateOutput.create({
      subject_id,
      stage_number: 3,
      output_type: 'CO_ATTAINMENT_FINAL',
      file_path: consolidatedOutput
    });

    // Update phase
    await updateSubjectPhase(subject_id, 2);

    res.json({
      status: 'success',
      message: 'Phase 2 processing complete',
      output_path: consolidatedOutput,
      execution_time_ms: Date.now() - startTime
    });
  } catch (error) {
    await File.update(
      {
        processing_status: 'failed',
        processing_error: error.message
      },
      {
        where: {
          subject_id: req.body.subject_id,
          file_type: { [Op.in]: ['CAT2_QP', 'CAT2_MARKS', 'ASS1', 'ASS2'] },
          processing_status: 'processing'
        }
      }
    );

    next(error);
  }
});

module.exports = router;
