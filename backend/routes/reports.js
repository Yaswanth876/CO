const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { Subject, File, IntermediateOutput, ProcessingLog, Configuration, FacultyCourseAssignment, Report } = require('../models');
const { fileExists, deleteFile } = require('../utils/fileManager');
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
 * GET /api/reports/faculty/my-reports
 * List all reports for the logged-in faculty
 */
router.get('/faculty/my-reports', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const reports = await Report.findAll({
      where: { faculty_id: userId },
      include: [
        { model: Subject, as: 'course', attributes: ['id', 'subject_code', 'subject_name', 'semester', 'academic_year'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ status: 'success', reports });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reports/:id/submit
 * Submit a report to the admin
 */
router.post('/:id/submit', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const report = await Report.findOne({
      where: { id: req.params.id, faculty_id: userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = 'Submitted';
    report.submitted_at = new Date();
    await report.save();

    await logActivity(userId, 'Report Submission', {
      report_id: report.id,
      course_id: report.course_id
    });

    res.json({ status: 'success', report });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reports/:id/unsubmit
 * Unsubmit a report (revert status back to Generated)
 */
router.post('/:id/unsubmit', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const report = await Report.findOne({
      where: { id: req.params.id, faculty_id: userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'Submitted') {
      return res.status(400).json({ error: 'Only submitted reports can be unsubmitted' });
    }

    report.status = 'Generated';
    report.submitted_at = null;
    await report.save();

    await logActivity(userId, 'Report Unsubmission', {
      report_id: report.id,
      course_id: report.course_id
    });

    res.json({ status: 'success', report });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/:subject_id
 * List available reports for a subject
 */
router.get('/:subject_id', async (req, res, next) => {
  try {
    const { subject_id } = req.params;
    const userId = req.user.id;

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    const outputs = await IntermediateOutput.findAll({
      where: { subject_id },
      order: [['created_at', 'DESC']]
    });

    const reports = outputs.map(o => ({
      id: o.id,
      stage: o.stage_number,
      type: o.output_type,
      file_path: o.file_path,
      generated_at: o.created_at,
      file_exists: fileExists(o.file_path),
      download_url: `/api/reports/download/${o.id}`
    }));

    res.json({
      status: 'success',
      subject_id,
      count: reports.length,
      reports
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/latest/:subject_id/:output_type
 * Get latest report of a specific type
 */
router.get('/latest/:subject_id/:output_type', async (req, res, next) => {
  try {
    const { subject_id, output_type } = req.params;
    const userId = req.user.id;

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    const output = await IntermediateOutput.findOne({
      where: { subject_id, output_type },
      order: [['created_at', 'DESC']]
    });

    if (!output) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!fileExists(output.file_path)) {
      return res.status(404).json({ error: 'Report file not found on server' });
    }

    res.json({
      status: 'success',
      report: {
        id: output.id,
        type: output.output_type,
        file_path: output.file_path,
        generated_at: output.created_at,
        download_url: `/api/reports/download/${output.id}`
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/download/:id
 * Download a specific report file
 */
router.get('/download/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const output = await IntermediateOutput.findByPk(id, {
      include: [{
        association: 'subject',
        model: Subject,
        attributes: ['id', 'user_id']
      }]
    });

    if (!output) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Verify assignment/role access
    let isAssigned = false;
    if (req.user.role === 'admin') {
      isAssigned = true;
    } else {
      const assignment = await FacultyCourseAssignment.findOne({
        where: { faculty_id: userId, course_id: output.subject.id }
      });
      isAssigned = !!assignment;
    }

    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify file exists
    if (!fileExists(output.file_path)) {
      return res.status(404).json({ error: 'Report file not found on server' });
    }

    // Generate filename for download
    const filename = `${output.output_type}_${output.subject.id}_${Date.now()}.xlsx`;

    // Download file
    res.download(output.file_path, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/download-file/:report_id
 * Download a report from reports table directly
 */
router.get('/download-file/:report_id', async (req, res, next) => {
  try {
    const report = await Report.findByPk(req.params.report_id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Check access
    let isAssigned = false;
    if (req.user.role === 'admin') {
      isAssigned = true;
    } else {
      const assignment = await FacultyCourseAssignment.findOne({
        where: { faculty_id: req.user.id, course_id: report.course_id }
      });
      isAssigned = !!assignment;
    }
    if (!isAssigned) return res.status(403).json({ error: 'Access denied' });

    if (!fileExists(report.report_file_path)) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.download(report.report_file_path, report.report_name + '.xlsx');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/download/:subject_id/:output_type
 * Download latest report of specific type
 */
router.get('/download/:subject_id/:output_type', async (req, res, next) => {
  try {
    const { subject_id, output_type } = req.params;
    const userId = req.user.id;

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    const output = await IntermediateOutput.findOne({
      where: { subject_id, output_type },
      order: [['created_at', 'DESC']]
    });

    if (!output || !fileExists(output.file_path)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const filename = `${output_type}_${subject_id}_${Date.now()}.xlsx`;
    res.download(output.file_path, filename);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reports/clear-process/:subject_id
 * Clear generated outputs and reset report-generation state for a subject.
 */
router.post('/clear-process/:subject_id', async (req, res, next) => {
  try {
    const { subject_id } = req.params;
    const userId = req.user.id;

    let subject;
    try {
      subject = await checkCourseAssignment(userId, req.user.role, subject_id);
    } catch (err) {
      if (err.message === 'Forbidden') return res.status(403).json({ error: 'You are not assigned to this course' });
      if (err.message === 'NotFound') return res.status(404).json({ error: 'Subject not found' });
      throw err;
    }

    const outputs = await IntermediateOutput.findAll({
      where: { subject_id }
    });

    for (const output of outputs) {
      if (output.file_path && fileExists(output.file_path)) {
        try {
          fs.unlinkSync(output.file_path);
        } catch (error) {
          // Ignore missing/delete failures and continue cleaning metadata.
        }
      }
    }

    await IntermediateOutput.destroy({
      where: { subject_id }
    });

    // Destroy Report table records too
    await Report.destroy({
      where: { course_id: subject_id }
    });

    const uploadedFiles = await File.findAll({
      where: { subject_id }
    });

    for (const file of uploadedFiles) {
      if (file.file_path) {
        deleteFile(file.file_path);
      }
    }

    await File.destroy({
      where: { subject_id }
    });

    await ProcessingLog.destroy({
      where: { subject_id }
    });

    const configuration = await Configuration.findOne({
      where: { subject_id }
    });

    if (configuration) {
      await configuration.destroy();
    }

    subject.current_phase = 0;
    subject.status = 'active';
    await subject.save();

    res.json({
      status: 'success',
      message: 'Process cleared successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
