/**
 * FacultyCourseAssignment Model
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const FacultyCourseAssignment = sequelize.define('FacultyCourseAssignment', {
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
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'faculty_course_assignments',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });

  return FacultyCourseAssignment;
};
