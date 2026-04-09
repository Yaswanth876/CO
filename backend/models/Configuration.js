/**
 * Configuration Model - stores EP, ELA, Constraint per subject
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Configuration = sequelize.define('Configuration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subject_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'subjects',
        key: 'id'
      }
    },
    ep: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 80.00
    },
    constraint_value: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 79.99
    },
    ela_co1: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 75.00
    },
    ela_co2: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 75.00
    },
    ela_co3: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 70.00
    },
    ela_co4: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 85.00
    },
    ela_co5: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 80.00
    },
    ela_co6: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 78.00
    }
  }, {
    tableName: 'configurations',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Configuration;
};
