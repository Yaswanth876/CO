/**
 * Sequelize database configuration
 */

require('dotenv').config();

const sqliteStoragePath = process.env.SQLITE_DB_PATH || './attainment.db';

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
