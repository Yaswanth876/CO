/**
 * Phase 3 Routes - Terminal Marks & Final Attainment
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const { Subject, File, Configuration, IntermediateOutput, ProcessingLog } = require('../models');
const { uploadErrorHandler } = require('../middleware/upload');
const { runStage4 } = require('../utils/pythonExecutor');
const { fileExists, getFileSizeMB, deleteFile } = require('../utils/fileManager');
const { updateSubjectPhase } = require('../utils/phaseTracker');

/**
 * POST /api/phase3/upload-terminal
 * Upload Terminal Marks
 */
router.post('/upload-terminal', uploadErrorHandler, async (req, res, next) => {
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
      file_type: 'TERMINAL',
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
 * POST /api/phase3/finalize
 * Generate final CO attainment report (run Stage 4)
 */
router.post('/finalize', async (req, res, next) => {
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

    // Verify Phase 2 is complete
    const phase2Output = await IntermediateOutput.findOne({
      where: { subject_id, output_type: 'CO_ATTAINMENT_FINAL', is_latest: true }
    });

    if (!phase2Output) {
      return res.status(400).json({ error: 'Phase 2 must be completed first' });
    }

    // Get Terminal file
    const terminalFile = await File.findOne({
      where: { subject_id, file_type: 'TERMINAL', processing_status: 'pending' }
    });

    if (!terminalFile || !fileExists(terminalFile.file_path)) {
      return res.status(400).json({ error: 'Terminal marks file not found' });
    }

    // Get configuration
    const config = await Configuration.findOne({
      where: { subject_id }
    });

    if (!config) {
      return res.status(400).json({ error: 'Configuration not found. Please set EP, constraint, and ELA values' });
    }

    // Validate configuration is set
    const ep = parseFloat(config.ep) || 80;
    const constraint = parseFloat(config.constraint_value) || 79.99;
    const ela = {
      CO1: parseFloat(config.ela_co1) || 75,
      CO2: parseFloat(config.ela_co2) || 75,
      CO3: parseFloat(config.ela_co3) || 70,
      CO4: parseFloat(config.ela_co4) || 85,
      CO5: parseFloat(config.ela_co5) || 80,
      CO6: parseFloat(config.ela_co6) || 78
    };

    // Run Stage 4
    terminalFile.processing_status = 'processing';
    await terminalFile.save();

    const outputsDir = process.env.OUTPUTS_DIR || './outputs';
    const finalOutput = path.join(outputsDir, `CO_ATTAINMENT_COMPLETE_${subject_id}_${Date.now()}.xlsx`);

    let stage4Result;
    try {
      stage4Result = await runStage4(
        phase2Output.file_path,
        terminalFile.file_path,
        finalOutput,
        ep,
        constraint,
        ela
      );
    } catch (error) {
      throw new Error(`Stage 4 failed: ${error.error || error.message}`);
    }

    if (stage4Result.status !== 'ok') {
      throw new Error(`Stage 4 error: ${stage4Result.message}`);
    }

    terminalFile.processing_status = 'success';
    await terminalFile.save();

    // Save final output
    await IntermediateOutput.create({
      subject_id,
      stage_number: 4,
      output_type: 'CO_ATTAINMENT_COMPLETE',
      file_path: finalOutput
    });

    // Update phase
    await updateSubjectPhase(subject_id, 3);

    // Mark subject as completed
    subject.status = 'completed';
    await subject.save();

    res.json({
      status: 'success',
      message: 'Final CO attainment report generated',
      output_path: finalOutput,
      execution_time_ms: Date.now() - startTime,
      configuration: {
        ep,
        constraint,
        ela
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
