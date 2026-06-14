/**
 * Admin Routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Subject, FacultyCourseAssignment, Report, ActivityLog, Configuration } = require('../models');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// Apply admin access control to all admin endpoints
router.use(authMiddleware);
router.use(adminMiddleware);

// ==========================================
// 1. FACULTY MANAGEMENT
// ==========================================

// Get all faculty members
router.get('/faculty', async (req, res, next) => {
  try {
    const faculty = await User.findAll({
      where: { role: 'faculty' },
      attributes: ['id', 'email', 'full_name', 'role', 'is_active', 'created_at']
    });
    res.json({ status: 'success', faculty });
  } catch (error) {
    next(error);
  }
});

// Create new faculty account
router.post('/faculty', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const faculty = await User.create({
      full_name: name,
      email,
      password_hash,
      role: 'faculty',
      is_active: true
    });

    await logActivity(req.user.id, 'Create Faculty', { target_faculty_id: faculty.id, email });

    res.status(201).json({
      status: 'success',
      faculty: {
        id: faculty.id,
        email: faculty.email,
        full_name: faculty.full_name,
        is_active: faculty.is_active
      }
    });
  } catch (error) {
    next(error);
  }
});

// Edit faculty member details or status
router.put('/faculty/:id', async (req, res, next) => {
  try {
    const { name, is_active } = req.body;
    const faculty = await User.findOne({ where: { id: req.params.id, role: 'faculty' } });

    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    if (name !== undefined) faculty.full_name = name;
    if (is_active !== undefined) faculty.is_active = is_active;

    await faculty.save();

    await logActivity(req.user.id, 'Edit Faculty', { target_faculty_id: faculty.id, name, is_active });

    res.json({
      status: 'success',
      faculty: {
        id: faculty.id,
        email: faculty.email,
        full_name: faculty.full_name,
        is_active: faculty.is_active
      }
    });
  } catch (error) {
    next(error);
  }
});

// Reset password for a faculty member
router.post('/faculty/:id/reset-password', async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const faculty = await User.findOne({ where: { id: req.params.id, role: 'faculty' } });
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    faculty.password_hash = await bcrypt.hash(password, 10);
    await faculty.save();

    await logActivity(req.user.id, 'Password Change (Admin Reset)', { target_faculty_id: faculty.id });

    res.json({ status: 'success', message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});


// ==========================================
// 2. COURSE MANAGEMENT
// ==========================================

// Get all courses (subjects)
router.get('/courses', async (req, res, next) => {
  try {
    const courses = await Subject.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json({ status: 'success', courses });
  } catch (error) {
    next(error);
  }
});

// Create a new course
router.post('/courses', async (req, res, next) => {
  try {
    const { course_code, course_name, semester, academic_year, regulation } = req.body;

    if (!course_code || !course_name || !semester || !academic_year) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    // Direct mapping to `subjects` table structure
    const subject = await Subject.create({
      user_id: req.user.id, // For backward compatibility
      subject_code: course_code,
      subject_name: course_name,
      semester,
      academic_year,
      regulation,
      current_phase: 0,
      status: 'active'
    });

    // Create default configuration row
    await Configuration.create({
      subject_id: subject.id,
      ep: 80.00,
      constraint_value: 79.99,
      ela_co1: 75.00,
      ela_co2: 75.00,
      ela_co3: 70.00,
      ela_co4: 85.00,
      ela_co5: 80.00,
      ela_co6: 78.00
    });

    await logActivity(req.user.id, 'Create Course', { course_id: subject.id, course_code });

    res.status(201).json({ status: 'success', course: subject });
  } catch (error) {
    next(error);
  }
});

// Edit course
router.put('/courses/:id', async (req, res, next) => {
  try {
    const { course_code, course_name, semester, academic_year, regulation } = req.body;
    const subject = await Subject.findByPk(req.params.id);

    if (!subject) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course_code !== undefined) subject.subject_code = course_code;
    if (course_name !== undefined) subject.subject_name = course_name;
    if (semester !== undefined) subject.semester = semester;
    if (academic_year !== undefined) subject.academic_year = academic_year;
    if (regulation !== undefined) subject.regulation = regulation;

    await subject.save();

    await logActivity(req.user.id, 'Edit Course', { course_id: subject.id, course_code });

    res.json({ status: 'success', course: subject });
  } catch (error) {
    next(error);
  }
});

// Archive course
router.delete('/courses/:id', async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id);

    if (!subject) {
      return res.status(404).json({ error: 'Course not found' });
    }

    subject.status = 'archived';
    await subject.save();

    await logActivity(req.user.id, 'Archive Course', { course_id: subject.id });

    res.json({ status: 'success', message: 'Course archived successfully' });
  } catch (error) {
    next(error);
  }
});


// ==========================================
// 3. COURSE ASSIGNMENT
// ==========================================

// Get all assignments
router.get('/assignments', async (req, res, next) => {
  try {
    const assignments = await FacultyCourseAssignment.findAll({
      include: [
        { model: User, as: 'faculty', attributes: ['id', 'email', 'full_name'] },
        { model: Subject, as: 'course', attributes: ['id', 'subject_code', 'subject_name'] }
      ]
    });
    res.json({ status: 'success', assignments });
  } catch (error) {
    next(error);
  }
});

// Assign course to faculty
router.post('/assignments', async (req, res, next) => {
  try {
    const { faculty_id, course_id } = req.body;

    if (!faculty_id || !course_id) {
      return res.status(400).json({ error: 'Faculty ID and Course ID are required' });
    }

    // Check if faculty and course exist
    const faculty = await User.findOne({ where: { id: faculty_id, role: 'faculty' } });
    const course = await Subject.findByPk(course_id);

    if (!faculty || !course) {
      return res.status(404).json({ error: 'Faculty or Course not found' });
    }

    // Check duplicate assignment
    const existing = await FacultyCourseAssignment.findOne({
      where: { faculty_id, course_id }
    });

    if (existing) {
      return res.status(400).json({ error: 'Course already assigned to this faculty' });
    }

    const assignment = await FacultyCourseAssignment.create({
      faculty_id,
      course_id,
      assigned_by: req.user.id
    });

    await logActivity(req.user.id, 'Course Assignment', { faculty_id, course_id });

    res.status(201).json({ status: 'success', assignment });
  } catch (error) {
    next(error);
  }
});

// Remove course assignment
router.delete('/assignments/:id', async (req, res, next) => {
  try {
    const assignment = await FacultyCourseAssignment.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await logActivity(req.user.id, 'Remove Assignment', {
      faculty_id: assignment.faculty_id,
      course_id: assignment.course_id
    });

    await assignment.destroy();

    res.json({ status: 'success', message: 'Assignment removed successfully' });
  } catch (error) {
    next(error);
  }
});


// ==========================================
// 4. REPORT MONITORING & REVIEW
// ==========================================

// Get all reports from all courses/faculties
router.get('/reports', async (req, res, next) => {
  try {
    const reports = await Report.findAll({
      include: [
        { model: User, as: 'faculty', attributes: ['id', 'email', 'full_name'] },
        { model: Subject, as: 'course', attributes: ['id', 'subject_code', 'subject_name', 'semester', 'academic_year'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ status: 'success', reports });
  } catch (error) {
    next(error);
  }
});

// Approve or Reject a report
router.post('/reports/:id/review', async (req, res, next) => {
  try {
    const { action } = req.body; // 'Approve' or 'Reject'

    if (!['Approve', 'Reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be Approve or Reject' });
    }

    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';
    report.status = newStatus;
    report.reviewed_at = new Date();
    report.reviewed_by = req.user.id;
    await report.save();

    await logActivity(req.user.id, `Report ${action}`, {
      report_id: report.id,
      course_id: report.course_id
    });

    res.json({ status: 'success', report });
  } catch (error) {
    next(error);
  }
});


// ==========================================
// 5. ACTIVITY LOG MONITORING
// ==========================================

// Get activity logs
router.get('/activity-logs', async (req, res, next) => {
  try {
    const logs = await ActivityLog.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'full_name', 'role'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 200
    });
    res.json({ status: 'success', logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
