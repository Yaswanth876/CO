/**
 * Phase 3 Routes - Terminal Marks & Final Attainment
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const { Subject, File, Configuration, IntermediateOutput, ProcessingLog, FacultyCourseAssignment, Report } = require('../models');
const { uploadErrorHandler } = require('../middleware/upload');
const { runStage4 } = require('../utils/pythonExecutor');
const { fileExists, getFileSizeMB, deleteFile } = require('../utils/fileManager');
const { updateSubjectPhase } = require('../utils/phaseTracker');
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

const defaultConfigurationValues = {
  ep: 80.00,
  constraint_value: 79.99,
  ela_co1: 75.00,
  ela_co2: 75.00,
  ela_co3: 70.00,
  ela_co4: 85.00,
  ela_co5: 80.00,
  ela_co6: 78.00
};

function createReportUploadHandler(fileType) {
  return async (req, res, next) => {
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
        file_type: fileType,
        original_filename: req.file.originalname,
        stored_filename: req.file.filename,
        file_path: req.file.path,
        file_size: fileSizeMB,
        uploaded_by: userId,
        processing_status: 'success'
      });

      await logActivity(userId, 'Marks Upload', { course_id: subject_id, file_type: fileType });

      res.status(201).json({
        status: 'success',
        file: {
          id: fileRecord.id,
          file_type: fileRecord.file_type,
          stored_filename: fileRecord.stored_filename,
          file_size: fileSizeMB,
          processing_status: 'success'
        }
      });
    } catch (error) {
      if (req.file) deleteFile(req.file.path);
      next(error);
    }
  };
}

/**
 * POST /api/phase3/upload-terminal
 * Upload Terminal Marks
 */
router.post('/upload-terminal-qp', uploadErrorHandler, async (req, res, next) => {
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
      file_type: 'TERMINAL_QP',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: req.file.path,
      file_size: fileSizeMB,
      uploaded_by: userId,
      processing_status: 'success'
    });

    await logActivity(userId, 'Marks Upload', { course_id: subject_id, file_type: 'TERMINAL_QP' });

    res.status(201).json({
      status: 'success',
      file: {
        id: fileRecord.id,
        file_type: fileRecord.file_type,
        stored_filename: fileRecord.stored_filename,
        file_size: fileSizeMB,
        processing_status: 'success'
      }
    });
  } catch (error) {
    if (req.file) deleteFile(req.file.path);
    next(error);
  }
});

router.post('/upload-report', uploadErrorHandler, async (req, res, next) => {
  const fileType = req.body.file_type;
  if (!['CAT1_REPORT', 'CAT2_REPORT'].includes(fileType)) {
    return res.status(400).json({ error: 'Invalid file type. Must be CAT1_REPORT or CAT2_REPORT' });
  }

  return createReportUploadHandler(fileType)(req, res, next);
});

router.post('/upload-terminal', uploadErrorHandler, async (req, res, next) => {
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
      file_type: 'TERMINAL',
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_path: req.file.path,
      file_size: fileSizeMB,
      uploaded_by: userId,
      processing_status: 'pending'
    });

    await logActivity(userId, 'Marks Upload', { course_id: subject_id, file_type: 'TERMINAL' });

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

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    // Verify Mid-sem report is complete
    const phase2Output = await IntermediateOutput.findOne({
      where: {
        subject_id,
        output_type: { [require('sequelize').Op.in]: ['MID_SEM_REPORT', 'CO_ATTAINMENT_FINAL'] }
      },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (!phase2Output) {
      return res.status(400).json({ error: 'Mid-sem report must be completed first' });
    }

    const terminalQpFile = await File.findOne({
      where: { subject_id, file_type: 'TERMINAL_QP' },
      order: [['created_at', 'DESC'], ['id', 'DESC']]
    });

    if (!terminalQpFile || !fileExists(terminalQpFile.file_path)) {
      return res.status(400).json({ error: 'Terminal question paper file not found' });
    }

    // Get Terminal file
    const terminalFile = await File.findOne({
      where: { subject_id, file_type: 'TERMINAL', processing_status: 'pending' }
    });

    if (!terminalFile || !fileExists(terminalFile.file_path)) {
      return res.status(400).json({ error: 'Terminal marks file not found' });
    }

    // Get configuration
    const [config] = await Configuration.findOrCreate({
      where: { subject_id },
      defaults: {
        subject_id,
        ...defaultConfigurationValues
      }
    });

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
      stage4Result = await runStage4({
        phase: 'end',
        coAttainmentPath: phase2Output.file_path,
        terminalPath: terminalFile.file_path,
        outputPath: finalOutput,
        ep,
        constraint,
        ela
      });
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
      file_path: finalOutput,
      is_latest: true
    });

    // Create Report record
    await Report.create({
      faculty_id: userId,
      course_id: subject_id,
      report_file_path: finalOutput,
      report_name: `${subject.subject_code}_FINAL_ATTAINMENT_REPORT`,
      status: 'Generated',
      generated_at: new Date()
    });

    await logActivity(userId, 'Report Generation', {
      course_id: subject_id,
      report_type: 'Final-sem'
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
