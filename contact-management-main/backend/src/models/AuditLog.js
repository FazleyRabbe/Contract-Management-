const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../config/constants');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_ACTIONS),
    },
    entityType: {
      type: String,
      required: true,
      enum: ['Contract', 'User', 'ServiceProvider', 'ServiceProviderRequest', 'Offer'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for public API actions
      default: null,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      reason: String,
    },
    description: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to log an action
auditLogSchema.statics.log = async function ({
  action,
  entityType,
  entityId,
  performedBy,
  changes = {},
  metadata = {},
  description = '',
}) {
  return await this.create({
    action,
    entityType,
    entityId,
    performedBy,
    changes,
    metadata,
    description,
  });
};

// Static method to get entity history
auditLogSchema.statics.getEntityHistory = function (entityType, entityId) {
  return this.find({ entityType, entityId })
    .populate('performedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function (userId, limit = 50) {
  return this.find({ performedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
