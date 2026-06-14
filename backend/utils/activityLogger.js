/**
 * Activity Logger Utility
 */

const { ActivityLog } = require('../models');

async function logActivity(userId, action, metadata = {}) {
  try {
    await ActivityLog.create({
      user_id: userId,
      action,
      metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : String(metadata)
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

module.exports = {
  logActivity
};
