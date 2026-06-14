/**
 * Development seed helpers
 */

const bcrypt = require('bcrypt');
const { User, Subject, Configuration, FacultyCourseAssignment } = require('../models');

const DEV_ALLOWED_EMAILS = new Set(['faculty1@tce.edu', 'faculty2@tce.edu']);
const DEV_PASSWORD = 'tce123';
const DEV_SUBJECTS = {
  'faculty1@tce.edu': [
    {
      subject_code: 'CS1101',
      subject_name: 'Data Structures',
      academic_year: '2025-26',
      semester: 5
    },
    {
      subject_code: 'CS1103',
      subject_name: 'Operating Systems',
      academic_year: '2025-26',
      semester: 5
    },
    {
      subject_code: 'CS1105',
      subject_name: 'Computer Networks',
      academic_year: '2025-26',
      semester: 5
    }
  ],
  'faculty2@tce.edu': [
    {
      subject_code: 'CS2202',
      subject_name: 'Database Systems',
      academic_year: '2025-26',
      semester: 6
    },
    {
      subject_code: 'CS2204',
      subject_name: 'Compiler Design',
      academic_year: '2025-26',
      semester: 6
    },
    {
      subject_code: 'CS2206',
      subject_name: 'Machine Learning',
      academic_year: '2025-26',
      semester: 6
    }
  ]
};

async function ensureDevFacultySeed() {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    return;
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // Seed default Admin
  const adminEmail = 'admin@tce.edu';
  let admin = await User.findOne({ where: { email: adminEmail } });
  if (!admin) {
    await User.create({
      email: adminEmail,
      password_hash: await bcrypt.hash('admin123', 10),
      full_name: 'System Admin',
      role: 'admin',
      is_active: true
    });
  }

  for (const email of DEV_ALLOWED_EMAILS) {
    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        email,
        password_hash: passwordHash,
        full_name: email.split('@')[0],
        role: 'faculty',
        is_active: true
      });
    }

    const seedSubjects = DEV_SUBJECTS[email] || [];

    for (const seed of seedSubjects) {
      const [subject] = await Subject.findOrCreate({
        where: {
          user_id: user.id,
          subject_code: seed.subject_code
        },
        defaults: {
          user_id: user.id,
          subject_code: seed.subject_code,
          subject_name: seed.subject_name,
          academic_year: seed.academic_year,
          semester: seed.semester,
          current_phase: 0,
          status: 'active'
        }
      });

      // Seed assignments for compatibility
      await FacultyCourseAssignment.findOrCreate({
        where: {
          faculty_id: user.id,
          course_id: subject.id
        },
        defaults: {
          faculty_id: user.id,
          course_id: subject.id,
          assigned_by: admin ? admin.id : user.id
        }
      });

      await Configuration.findOrCreate({
        where: { subject_id: subject.id },
        defaults: { subject_id: subject.id }
      });
    }
  }
}

module.exports = {
  DEV_ALLOWED_EMAILS,
  DEV_PASSWORD,
  ensureDevFacultySeed
};