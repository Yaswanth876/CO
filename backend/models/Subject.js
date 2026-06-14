/**
 * Subject Model
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Subject = sequelize.define('Subject', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    subject_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    subject_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    academic_year: {
      type: DataTypes.STRING(20)
    },
    semester: {
      type: DataTypes.INTEGER
    },
    regulation: {
      type: DataTypes.STRING(50)
    },
    current_phase: {
      type: DataTypes.INTEGER,
      defaultValue: 0
      // 0=created, 1=CAT1_done, 2=CAT2_done, 3=final_done
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'archived'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'subjects',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'subject_code']
      }
    ]
  });

  return Subject;
};
