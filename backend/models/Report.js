/**
 * Report Model
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    faculty_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    report_file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    report_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Generated', 'Submitted', 'Reviewed', 'Approved', 'Rejected'),
      defaultValue: 'Generated',
      allowNull: false
    },
    generated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'reports',
    timestamps: true,
    underscored: true
  });

  return Report;
};
