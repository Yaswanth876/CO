/**
 * Reports Routes - Download and retrieve reports
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { Subject, IntermediateOutput } = require('../models');
const { fileExists } = require('../utils/fileManager');

/**
 * GET /api/reports/:subject_id
 * List available reports for a subject
 */
router.get('/:subject_id', async (req, res, next) => {
  try {
    const { subject_id } = req.params;
    const userId = req.user.id;

    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
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

    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
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

    // Verify ownership
    if (output.subject.user_id !== userId) {
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
 * GET /api/reports/download/:subject_id/:output_type
 * Download latest report of specific type
 */
router.get('/download/:subject_id/:output_type', async (req, res, next) => {
  try {
    const { subject_id, output_type } = req.params;
    const userId = req.user.id;

    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
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

module.exports = router;
