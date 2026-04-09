/**
 * CO Attainment Automation Backend Server
 * Main entry point for Express application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { sequelize } = require('./models');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { ensureDir } = require('./utils/fileManager');
const { ensureDevFacultySeed } = require('./utils/devSeed');

// Route imports
const authRoutes = require('./routes/auth');
const subjectRoutes = require('./routes/subjects');
const phase1Routes = require('./routes/phase1');
const phase2Routes = require('./routes/phase2');
const phase3Routes = require('./routes/phase3');
const reportRoutes = require('./routes/reports');
const configRoutes = require('./routes/configuration');

const app = express();

// ============================================================
// MIDDLEWARE SETUP
// ============================================================

// Logging
app.use(morgan('combined'));

// CORS
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : true;

app.use(cors({
  origin: corsOrigins,
  credentials: false
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure upload/output directories exist
ensureDir(process.env.UPLOADS_DIR || './uploads');
ensureDir(process.env.OUTPUTS_DIR || './outputs');

// Serve static files (for downloading reports)
app.use('/outputs', express.static(process.env.OUTPUTS_DIR || './outputs'));
app.use('/uploads', express.static(process.env.UPLOADS_DIR || './uploads'));

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const dialect = sequelize.getDialect();
  const database = dialect === 'sqlite'
    ? sequelize.options.storage
    : sequelize.config.database;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dialect,
    database
  });
});

// ============================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================

app.use('/api/subjects', authMiddleware, subjectRoutes);
app.use('/api/phase1', authMiddleware, phase1Routes);
app.use('/api/phase2', authMiddleware, phase2Routes);
app.use('/api/phase3', authMiddleware, phase3Routes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/configuration', authMiddleware, configRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// DATABASE SYNC & SERVER START
// ============================================================

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Sync database
    await sequelize.sync({ alter: false });
    console.log('✓ Database synchronized');

    await ensureDevFacultySeed();
    console.log('✓ Development faculty seed ensured');

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Uploads dir: ${process.env.UPLOADS_DIR || './uploads'}`);
      console.log(`✓ Outputs dir: ${process.env.OUTPUTS_DIR || './outputs'}`);
      console.log(`✓ Python stage dir: ${process.env.PYTHON_STAGE_DIR || './python'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

start();

module.exports = app;
