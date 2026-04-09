/**
 * File Model
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const File = sequelize.define('File', {
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
    file_type: {
      type: DataTypes.STRING(50),
      allowNull: false
      // 'CAT1_QP', 'CAT1_MARKS', 'CAT2_QP', 'CAT2_MARKS', 'ASS1', 'ASS2', 'TERMINAL'
    },
    original_filename: {
      type: DataTypes.STRING
    },
    stored_filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    processing_status: {
      type: DataTypes.ENUM('pending', 'processing', 'success', 'failed'),
      defaultValue: 'pending'
    },
    processing_error: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'files',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return File;
};
