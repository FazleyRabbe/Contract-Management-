const mongoose = require('mongoose');
const { OFFER_STATUS, VALIDATION } = require('../config/constants');

const offerSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: [true, 'Contract reference is required'],
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: [true, 'Provider reference is required'],
    },
    // Denormalized provider details for display
    providerDetails: {
      companyName: {
        type: String,
        maxlength: [200, 'Company name cannot exceed 200 characters'],
      },
      role: {
        type: String,
        maxlength: [100, 'Role cannot exceed 100 characters'],
      },
      email: {
        type: String,
      },
      phone: {
        countryCode: String,
        number: String,
      },
      category: String,
    },
    // Offer details
    offerAmount: {
      amount: {
        type: Number,
        required: [true, 'Offer amount is required'],
        min: [0, 'Offer amount cannot be negative'],
      },
      currency: {
        type: String,
        default: 'EUR',
      },
    },
    proposedTimeline: {
      startDate: {
        type: Date,
        required: [true, 'Proposed start date is required'],
      },
      endDate: {
        type: Date,
        required: [true, 'Proposed end date is required'],
      },
    },
    description: {
      type: String,
      required: [true, 'Offer description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    deliverables: [{
      title: {
        type: String,
        required: true,
      },
      description: String,
      estimatedDeliveryDate: Date,
    }],
    // Additional terms
    terms: {
      type: String,
      maxlength: [1500, 'Terms cannot exceed 1500 characters'],
    },
    // Attachments (proposal documents, etc.)
    attachments: [{
      filename: String,
      originalName: String,
      path: String,
      mimetype: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Offer status
    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.PENDING,
    },
    // Selection details (when selected by coordinator)
    selectedAt: Date,
    selectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    selectionNotes: String,
    // Rejection details
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,
    // Withdrawal
    withdrawnAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
offerSchema.index({ contract: 1 });
offerSchema.index({ provider: 1 });
offerSchema.index({ status: 1 });
offerSchema.index({ createdAt: -1 });
// Ensure one offer per provider per contract
offerSchema.index({ contract: 1, provider: 1 }, { unique: true });

// Virtual for proposed duration in days
offerSchema.virtual('proposedDurationDays').get(function () {
  if (!this.proposedTimeline?.startDate || !this.proposedTimeline?.endDate) return null;
  const diffTime = Math.abs(this.proposedTimeline.endDate - this.proposedTimeline.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save validation
offerSchema.pre('save', function (next) {
  // Validate timeline
  if (this.proposedTimeline?.startDate >= this.proposedTimeline?.endDate) {
    throw new Error('End date must be after start date');
  }
  next();
});

// Method to select this offer
offerSchema.methods.select = async function (userId, notes = null) {
  this.status = OFFER_STATUS.SELECTED;
  this.selectedAt = new Date();
  this.selectedBy = userId;
  this.selectionNotes = notes;
  await this.save();
  return this;
};

// Method to reject this offer
offerSchema.methods.reject = async function (userId, reason = null) {
  this.status = OFFER_STATUS.REJECTED;
  this.rejectedAt = new Date();
  this.rejectedBy = userId;
  this.rejectionReason = reason;
  await this.save();
  return this;
};

// Method to withdraw this offer
offerSchema.methods.withdraw = async function () {
  if (this.status !== OFFER_STATUS.PENDING) {
    throw new Error('Only pending offers can be withdrawn');
  }
  this.status = OFFER_STATUS.WITHDRAWN;
  this.withdrawnAt = new Date();
  await this.save();
  return this;
};

// Static method to get offers for a contract
offerSchema.statics.getContractOffers = async function (contractId, status = null) {
  const query = { contract: contractId };
  if (status) {
    query.status = status;
  }
  return await this.find(query)
    .populate('provider', 'name email category tags rating')
    .sort({ createdAt: -1 });
};

// Static method to get offers by provider
offerSchema.statics.getProviderOffers = async function (providerId, status = null) {
  const query = { provider: providerId };
  if (status) {
    query.status = status;
  }
  return await this.find(query)
    .populate('contract', 'title referenceNumber status')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Offer', offerSchema);
