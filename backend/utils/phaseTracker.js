/**
 * Subject Phase Tracking Utilities
 */

const { Subject, File, Configuration, IntermediateOutput } = require('../models');

/**
 * Get complete subject status including phase and files
 */
async function getSubjectStatus(subjectId) {
  const subject = await Subject.findByPk(subjectId, {
    include: [
      { association: 'files', as: 'files' },
      { association: 'configuration', as: 'configuration' }
    ]
  });

  if (!subject) {
    throw new Error('Subject not found');
  }

  const files = subject.files || [];

  // Determine completion status for each phase
  const phase1 = {
    cat1_qp: files.some(f => f.file_type === 'CAT1_QP' && f.processing_status === 'success'),
    cat1_marks: files.some(f => f.file_type === 'CAT1_MARKS' && f.processing_status === 'success'),
    completed: false
  };
  phase1.completed = phase1.cat1_qp && phase1.cat1_marks;

  const phase2 = {
    cat2_qp: files.some(f => f.file_type === 'CAT2_QP' && f.processing_status === 'success'),
    cat2_marks: files.some(f => f.file_type === 'CAT2_MARKS' && f.processing_status === 'success'),
    ass1: files.some(f => f.file_type === 'ASS1' && f.processing_status === 'success'),
    ass2: files.some(f => f.file_type === 'ASS2' && f.processing_status === 'success'),
    completed: false
  };
  phase2.completed = phase2.cat2_qp && phase2.cat2_marks && phase2.ass1 && phase2.ass2;

  const phase3 = {
    terminal_qp: files.some(f => f.file_type === 'TERMINAL_QP' && f.processing_status === 'success'),
    terminal: files.some(f => f.file_type === 'TERMINAL' && f.processing_status === 'success'),
    cat1_report: files.some(f => f.file_type === 'CAT1_REPORT' && f.processing_status === 'success'),
    cat2_report: files.some(f => f.file_type === 'CAT2_REPORT' && f.processing_status === 'success'),
    configuration_set: !!subject.configuration,
    completed: false
  };
  phase3.completed = phase3.terminal_qp && phase3.terminal && phase3.cat1_report && phase3.cat2_report && phase3.configuration_set;

  return {
    subject_id: subject.id,
    subject_code: subject.subject_code,
    subject_name: subject.subject_name,
    academic_year: subject.academic_year,
    current_phase: subject.current_phase,
    status: subject.status,
    phase1,
    phase2,
    phase3,
    configuration: subject.configuration,
    files: files.map(f => ({
      id: f.id,
      file_type: f.file_type,
      original_filename: f.original_filename,
      processing_status: f.processing_status,
      file_size: f.file_size,
      uploaded_at: f.created_at
    }))
  };
}

/**
 * Update subject phase after successful processing
 */
async function updateSubjectPhase(subjectId, phase) {
  const subject = await Subject.findByPk(subjectId);
  if (!subject) {
    throw new Error('Subject not found');
  }

  const status = await getSubjectStatus(subjectId);

  // Determine new phase based on completion
  let newPhase = 0;
  if (status.phase1.completed) newPhase = 1;
  if (status.phase2.completed) newPhase = 2;
  if (status.phase3.completed) newPhase = 3;

  if (newPhase > subject.current_phase) {
    subject.current_phase = newPhase;
    await subject.save();
  }

  return newPhase;
}

/**
 * Get next required file for a phase
 */
function getNextRequiredFile(status, targetPhase) {
  if (targetPhase === 1) {
    if (!status.phase1.cat1_qp) return 'CAT1_QP';
    if (!status.phase1.cat1_marks) return 'CAT1_MARKS';
  } else if (targetPhase === 2) {
    if (!status.phase2.cat2_qp) return 'CAT2_QP';
    if (!status.phase2.cat2_marks) return 'CAT2_MARKS';
    if (!status.phase2.ass1) return 'ASS1';
    if (!status.phase2.ass2) return 'ASS2';
  } else if (targetPhase === 3) {
    if (!status.phase3.terminal_qp) return 'TERMINAL_QP';
    if (!status.phase3.terminal) return 'TERMINAL';
    if (!status.phase3.cat1_report) return 'CAT1_REPORT';
    if (!status.phase3.cat2_report) return 'CAT2_REPORT';
    if (!status.phase3.configuration_set) return 'CONFIGURATION';
  }
  return null;
}

/**
 * Validate all required files exist for a phase
 */
async function validatePhaseFiles(subjectId, phase) {
  const status = await getSubjectStatus(subjectId);
  const requiredFields = phase === 1
    ? ['cat1_qp', 'cat1_marks']
    : phase === 2
      ? ['cat2_qp', 'cat2_marks', 'ass1', 'ass2']
      : ['terminal_qp', 'terminal', 'cat1_report', 'cat2_report', 'configuration_set'];

  const phaseData = phase === 1 ? status.phase1 : phase === 2 ? status.phase2 : status.phase3;

  return requiredFields.every(field => phaseData[field]);
}

module.exports = {
  getSubjectStatus,
  updateSubjectPhase,
  getNextRequiredFile,
  validatePhaseFiles
};
