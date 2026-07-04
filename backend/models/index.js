/**
 * Sequelize Models Index
 * Initialize and export all models
 */

const { Sequelize } = require('sequelize');
const UserModel = require('./User');
const SubjectModel = require('./Subject');
const FileModel = require('./File');
const ConfigurationModel = require('./Configuration');
const ProcessingLogModel = require('./ProcessingLog');
const FacultyCourseAssignmentModel = require('./FacultyCourseAssignment');
const ReportModel = require('./Report');
const ActivityLogModel = require('./ActivityLog');

const config = require('../config/database');
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

// Initialize models
const User = UserModel(sequelize, Sequelize);
const Subject = SubjectModel(sequelize, Sequelize);
const File = FileModel(sequelize, Sequelize);
const Configuration = ConfigurationModel(sequelize, Sequelize);
const ProcessingLog = ProcessingLogModel(sequelize, Sequelize);
const FacultyCourseAssignment = FacultyCourseAssignmentModel(sequelize, Sequelize);
const Report = ReportModel(sequelize, Sequelize);
const ActivityLog = ActivityLogModel(sequelize, Sequelize);

// Define associations
User.hasMany(Subject, { foreignKey: 'user_id', as: 'subjects' });
Subject.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Subject.hasMany(File, { foreignKey: 'subject_id', as: 'files' });
File.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Subject.hasOne(Configuration, { foreignKey: 'subject_id', as: 'configuration' });
Configuration.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });


Subject.hasMany(ProcessingLog, { foreignKey: 'subject_id', as: 'logs' });
ProcessingLog.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

// New associations
User.hasMany(FacultyCourseAssignment, { foreignKey: 'faculty_id', as: 'assignments' });
FacultyCourseAssignment.belongsTo(User, { foreignKey: 'faculty_id', as: 'faculty' });

Subject.hasMany(FacultyCourseAssignment, { foreignKey: 'course_id', as: 'assignments' });
FacultyCourseAssignment.belongsTo(Subject, { foreignKey: 'course_id', as: 'course' });

User.hasMany(Report, { foreignKey: 'faculty_id', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'faculty_id', as: 'faculty' });

Subject.hasMany(Report, { foreignKey: 'course_id', as: 'reports' });
Report.belongsTo(Subject, { foreignKey: 'course_id', as: 'course' });

User.hasMany(ActivityLog, { foreignKey: 'user_id', as: 'activity_logs' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Subject,
  File,
  Configuration,
  ProcessingLog,
  FacultyCourseAssignment,
  Report,
  ActivityLog
};
