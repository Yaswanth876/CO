const express = require('express');
const router = express.Router();
const { Subject, Configuration, FacultyCourseAssignment } = require('../models');
const { getSubjectStatus } = require('../utils/phaseTracker');

/**
 * POST /api/subjects
 * Create a new subject - ADMIN ONLY
 */
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Faculty cannot create courses' });
    }

    const { subject_code, subject_name, academic_year, semester, regulation } = req.body;
    const userId = req.user.id;

    if (!subject_code || !subject_name) {
      return res.status(400).json({ error: 'Subject code and name required' });
    }

    // Check for duplicate
    const existing = await Subject.findOne({
      where: { subject_code }
    });

    if (existing) {
      return res.status(400).json({ error: 'Subject already exists' });
    }

    // Create subject
    const subject = await Subject.create({
      user_id: userId,
      subject_code,
      subject_name,
      academic_year,
      semester,
      regulation,
      current_phase: 0
    });

    // Create default configuration
    await Configuration.create({
      subject_id: subject.id
    });

    res.status(201).json({
      status: 'success',
      subject: {
        id: subject.id,
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        academic_year: subject.academic_year,
        semester: subject.semester,
        current_phase: subject.current_phase
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subjects
 * List all subjects (assigned only for faculty, all for admin)
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    let subjects = [];

    if (req.user.role === 'admin') {
      subjects = await Subject.findAll({
        order: [['created_at', 'DESC']]
      });
    } else {
      // Find assigned courses
      const assignments = await FacultyCourseAssignment.findAll({
        where: { faculty_id: userId },
        include: [{ model: Subject, as: 'course' }]
      });
      subjects = assignments
        .map(a => a.course)
        .filter(c => c && c.status !== 'archived');
    }

    // Get status for each subject
    const results = await Promise.all(
      subjects.map(async (s) => {
        const status = await getSubjectStatus(s.id);
        return {
          id: s.id,
          subject_code: s.subject_code,
          subject_name: s.subject_name,
          academic_year: s.academic_year,
          semester: s.semester,
          current_phase: s.current_phase,
          status: s.status,
          created_at: s.created_at,
          ...status
        };
      })
    );

    res.json({
      status: 'success',
      count: results.length,
      subjects: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subjects/:id
 * Get subject details and status
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let isAssigned = false;
    if (req.user.role === 'admin') {
      isAssigned = true;
    } else {
      const assignment = await FacultyCourseAssignment.findOne({
        where: { faculty_id: userId, course_id: id }
      });
      if (assignment) {
        isAssigned = true;
      }
    }

    if (!isAssigned) {
      return res.status(403).json({ error: 'You are not assigned to this course' });
    }

    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const status = await getSubjectStatus(id);

    res.json({
      status: 'success',
      subject: {
        ...subject.toJSON(),
        ...status
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/subjects/:id
 * Update subject details - ADMIN ONLY
 */
router.put('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Faculty cannot edit courses' });
    }

    const { id } = req.params;
    const { subject_name, academic_year, semester, regulation } = req.body;

    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (subject_name) subject.subject_name = subject_name;
    if (academic_year) subject.academic_year = academic_year;
    if (semester !== undefined) subject.semester = semester;
    if (regulation) subject.regulation = regulation;

    await subject.save();

    res.json({
      status: 'success',
      subject: subject.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/subjects/:id
 * Archive a subject - ADMIN ONLY
 */
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Faculty cannot archive courses' });
    }

    const { id } = req.params;
    const subject = await Subject.findByPk(id);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    subject.status = 'archived';
    await subject.save();

    res.json({ status: 'success', message: 'Subject archived' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
