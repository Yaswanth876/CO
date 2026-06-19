/**
 * Sequelize database configuration
 */

require('dotenv').config();
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const sqliteDbPath = process.env.SQLITE_DB_PATH || 'attainment.db';
const sqliteStoragePath = path.isAbsolute(sqliteDbPath)
  ? sqliteDbPath
  : path.resolve(backendRoot, sqliteDbPath);

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: sqliteStoragePath,
    logging: console.log
  },
  production: {
    dialect: 'sqlite',
    storage: sqliteStoragePath,
    logging: false
  }
};
