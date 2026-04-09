/**
 * Sequelize Models Index
 * Initialize and export all models
 */

const { Sequelize } = require('sequelize');
const UserModel = require('./User');
const SubjectModel = require('./Subject');
const FileModel = require('./File');
const ConfigurationModel = require('./Configuration');
const IntermediateOutputModel = require('./IntermediateOutput');
const ProcessingLogModel = require('./ProcessingLog');

const config = require('../config/database');
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

// Initialize models
const User = UserModel(sequelize, Sequelize);
const Subject = SubjectModel(sequelize, Sequelize);
const File = FileModel(sequelize, Sequelize);
const Configuration = ConfigurationModel(sequelize, Sequelize);
const IntermediateOutput = IntermediateOutputModel(sequelize, Sequelize);
const ProcessingLog = ProcessingLogModel(sequelize, Sequelize);

// Define associations
User.hasMany(Subject, { foreignKey: 'user_id', as: 'subjects' });
Subject.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Subject.hasMany(File, { foreignKey: 'subject_id', as: 'files' });
File.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Subject.hasOne(Configuration, { foreignKey: 'subject_id', as: 'configuration' });
Configuration.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Subject.hasMany(IntermediateOutput, { foreignKey: 'subject_id', as: 'outputs' });
IntermediateOutput.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Subject.hasMany(ProcessingLog, { foreignKey: 'subject_id', as: 'logs' });
ProcessingLog.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

module.exports = {
  sequelize,
  User,
  Subject,
  File,
  Configuration,
  IntermediateOutput,
  ProcessingLog
};
