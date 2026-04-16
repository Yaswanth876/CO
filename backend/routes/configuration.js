/**
 * Configuration Routes - EP, ELA, Constraint
 */

const express = require('express');
const router = express.Router();
const { Subject, Configuration } = require('../models');

const defaultConfigurationValues = {
  ep: 80.00,
  constraint_value: 79.99,
  ela_co1: 75.00,
  ela_co2: 75.00,
  ela_co3: 70.00,
  ela_co4: 85.00,
  ela_co5: 80.00,
  ela_co6: 78.00
};

/**
 * GET /api/configuration/:subject_id
 * Get configuration for a subject
 */
router.get('/:subject_id', async (req, res, next) => {
  try {
    const { subject_id } = req.params;
    const userId = req.user.id;

    // Verify subject ownership
    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const [config] = await Configuration.findOrCreate({
      where: { subject_id },
      defaults: {
        subject_id,
        ...defaultConfigurationValues
      }
    });

    res.json({
      status: 'success',
      configuration: {
        subject_id: config.subject_id,
        ep: parseFloat(config.ep),
        constraint: parseFloat(config.constraint_value),
        ela: {
          CO1: parseFloat(config.ela_co1),
          CO2: parseFloat(config.ela_co2),
          CO3: parseFloat(config.ela_co3),
          CO4: parseFloat(config.ela_co4),
          CO5: parseFloat(config.ela_co5),
          CO6: parseFloat(config.ela_co6)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/configuration/:subject_id
 * Update configuration for a subject
 */
router.put('/:subject_id', async (req, res, next) => {
  try {
    const { subject_id } = req.params;
    const userId = req.user.id;
    const { ep, constraint, ela } = req.body;

    // Verify subject ownership
    const subject = await Subject.findOne({
      where: { id: subject_id, user_id: userId }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const [config] = await Configuration.findOrCreate({
      where: { subject_id },
      defaults: {
        subject_id,
        ...defaultConfigurationValues
      }
    });

    // Validate values
    if (ep !== undefined) {
      if (isNaN(parseFloat(ep)) || parseFloat(ep) < 0 || parseFloat(ep) > 100) {
        return res.status(400).json({ error: 'EP must be a number between 0 and 100' });
      }
      config.ep = parseFloat(ep);
    }

    if (constraint !== undefined) {
      if (isNaN(parseFloat(constraint))) {
        return res.status(400).json({ error: 'Constraint must be a number' });
      }
      config.constraint_value = parseFloat(constraint);
    }

    if (ela) {
      const coKeys = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'];
      for (const key of coKeys) {
        if (ela[key] !== undefined) {
          if (isNaN(parseFloat(ela[key])) || parseFloat(ela[key]) < 0 || parseFloat(ela[key]) > 100) {
            return res.status(400).json({
              error: `ELA ${key} must be a number between 0 and 100`
            });
          }
          config[`ela_${key.toLowerCase()}`] = parseFloat(ela[key]);
        }
      }
    }

    await config.save();

    res.json({
      status: 'success',
      message: 'Configuration updated',
      configuration: {
        subject_id: config.subject_id,
        ep: parseFloat(config.ep),
        constraint: parseFloat(config.constraint_value),
        ela: {
          CO1: parseFloat(config.ela_co1),
          CO2: parseFloat(config.ela_co2),
          CO3: parseFloat(config.ela_co3),
          CO4: parseFloat(config.ela_co4),
          CO5: parseFloat(config.ela_co5),
          CO6: parseFloat(config.ela_co6)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
