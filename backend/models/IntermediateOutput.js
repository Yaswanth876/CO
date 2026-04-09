/**
 * IntermediateOutput Model - tracks processed Excel files
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const IntermediateOutput = sequelize.define('IntermediateOutput', {
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
      type: DataTypes.INTEGER,
      allowNull: false  // 1, 2, 3, or 4
    },
    output_type: {
      type: DataTypes.STRING(50),
      allowNull: false
      // 'QP_FINAL', 'CAT1_FINAL', 'CAT2_FINAL', 'CO_ATTAINMENT_FINAL', 'CO_ATTAINMENT_COMPLETE'
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_latest: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'intermediate_outputs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at'
  });

  return IntermediateOutput;
};
