/**
 * ProcessingLog Model - audit trail for all Python stage executions
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const ProcessingLog = sequelize.define('ProcessingLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    stage_number: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.STRING(50)
      // 'started', 'completed', 'failed'
    },
    input_files: {
      type: DataTypes.TEXT  // JSON array
    },
    output_file: {
      type: DataTypes.STRING
    },
    error_message: {
      type: DataTypes.TEXT
    },
    execution_time_ms: {
      type: DataTypes.INTEGER
    },
    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    completed_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'processing_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at'
  });

  return ProcessingLog;
};
