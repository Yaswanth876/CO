/**
 * ActivityLog Model
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
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
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    metadata: {
      type: DataTypes.TEXT, // We can store JSON as text/string for SQLite
      allowNull: true
    }
  }, {
    tableName: 'activity_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });

  return ActivityLog;
};
