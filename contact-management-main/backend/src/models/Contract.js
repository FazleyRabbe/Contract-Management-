const mongoose = require('mongoose');
const {
  CONTRACT_TYPES,
  CONTRACT_STATUS,
  VALIDATION,
} = require('../config/constants');
const { generateContractRef, countWords } = require('../utils/helpers');

const contractSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      unique: true,
      // Not required - generated automatically in pre-save hook
    },
    title: {
      type: String,
      required: [true, 'Contract title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    contractType: {
      type: String,
      required: [true, 'Contract type is required'],
      enum: {
        values: Object.values(CONTRACT_TYPES),
        message: 'Invalid contract type',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      validate: {
        validator: function (v) {
          return countWords(v) <= VALIDATION.DESCRIPTION_MAX_WORDS;
        },
        message: `Description cannot exceed ${VALIDATION.DESCRIPTION_MAX_WORDS} words`,
      },
    },
    targetConditions: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || countWords(v) <= VALIDATION.TARGET_CONDITIONS_MAX_WORDS;
        },
        message: `Target conditions cannot exceed ${VALIDATION.TARGET_CONDITIONS_MAX_WORDS} words`,
      },
    },
    targetPersons: {
      type: Number,
      required: [true, 'Target persons is required'],
      min: [VALIDATION.MIN_TARGET_PERSONS, `Minimum ${VALIDATION.MIN_TARGET_PERSONS} person required`],
      max: [VALIDATION.MAX_TARGET_PERSONS, `Maximum ${VALIDATION.MAX_TARGET_PERSONS} persons allowed`],
    },
    budget: {
      minimum: {
        type: Number,
        required: [true, 'Minimum budget is required'],
        min: [0, 'Budget cannot be negative'],
      },
      maximum: {
        type: Number,
        required: [true, 'Maximum budget is required'],
        min: [0, 'Budget cannot be negative'],
      },
      currency: {
        type: String,
        default: 'EUR',
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: Object.values(CONTRACT_STATUS),
      default: CONTRACT_STATUS.DRAFT,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      default: null,
    },
    selectedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProviderRequest',
      default: null,
    },
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    review: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      createdAt: Date,
    },
    metadata: {
      viewCount: {
        type: Number,
        default: 0,
      },
      requestCount: {
        type: Number,
        default: 0,
      },
      offerCount: {
        type: Number,
        default: 0,
      },
    },
    // Multi-step workflow tracking
    workflow: {
      // Procurement Manager review
      procurement: {
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reviewedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
        },
        notes: String,
      },
      // Legal Counsel review
      legal: {
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reviewedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
        },
        notes: String,
      },
      // Contract Coordinator selection
      coordinator: {
        selectedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        selectedAt: Date,
        selectedOffer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Offer',
        },
        notes: String,
      },
      // Final Admin approval
      finalApproval: {
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        approvedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
        },
        notes: String,
      },
    },
    // Rejection tracking
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: Date,
    rejectionReason: String,
    rejectionStage: {
      type: String,
      enum: ['procurement', 'legal', 'coordinator', 'admin'],
    },
    // Open for offers timestamp
    openForOffersAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
contractSchema.index({ referenceNumber: 1 });
contractSchema.index({ client: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ contractType: 1 });
contractSchema.index({ assignedProvider: 1 });
contractSchema.index({ isDeleted: 1 });
contractSchema.index({ createdAt: -1 });
contractSchema.index({ title: 'text', description: 'text' });
contractSchema.index({ startDate: 1, endDate: 1 });

// Virtual for duration in days
contractSchema.virtual('durationDays').get(function () {
  if (!this.startDate || !this.endDate) return null;
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for budget range display
contractSchema.virtual('budgetRange').get(function () {
  return `${this.budget.minimum} - ${this.budget.maximum} ${this.budget.currency}`;
});

// Virtual to get client-facing status
contractSchema.virtual('clientStatus').get(function () {
  const statusMap = {
    [CONTRACT_STATUS.DRAFT]: 'Draft',
    [CONTRACT_STATUS.PENDING_PROCUREMENT]: 'Pending Procurement Review',
    [CONTRACT_STATUS.PENDING_LEGAL]: 'Pending Legal Review',
    [CONTRACT_STATUS.OPEN_FOR_OFFERS]: 'Open for Provider Offers',
    [CONTRACT_STATUS.OFFER_SELECTED]: 'Offer Selected',
    [CONTRACT_STATUS.PENDING_FINAL_APPROVAL]: 'Pending Final Approval',
    [CONTRACT_STATUS.FINAL_APPROVED]: 'Contract Approved',
    [CONTRACT_STATUS.REJECTED]: 'Rejected',
    [CONTRACT_STATUS.PENDING_APPROVAL]: 'Request Pending',
    [CONTRACT_STATUS.PUBLISHED]: 'Searching Provider',
    [CONTRACT_STATUS.SEARCHING_PROVIDER]: 'Searching Provider',
    [CONTRACT_STATUS.PROVIDER_ASSIGNED]: 'Waiting for Approval',
    [CONTRACT_STATUS.IN_PROGRESS]: 'In Progress',
    [CONTRACT_STATUS.COMPLETED]: 'Contract Completed',
    [CONTRACT_STATUS.CANCELLED]: 'Cancelled',
  };
  return statusMap[this.status] || this.status;
});

// Pre-save middleware
contractSchema.pre('save', async function (next) {
  // Generate reference number if new
  if (this.isNew && !this.referenceNumber) {
    this.referenceNumber = generateContractRef();
  }

  // Validate budget range
  if (this.budget.minimum > this.budget.maximum) {
    throw new Error('Minimum budget cannot be greater than maximum budget');
  }

  // Validate date range
  if (this.startDate >= this.endDate) {
    throw new Error('End date must be after start date');
  }

  next();
});

// Static method for soft delete
contractSchema.statics.softDelete = async function (contractId, userId) {
  return await this.findByIdAndUpdate(
    contractId,
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    },
    { new: true }
  );
};

// Static method to get active contracts
contractSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false });
};

// Method to check if contract can be edited
// Includes workflow statuses where respective role-holders can edit
contractSchema.methods.canBeEdited = function () {
  return [
    CONTRACT_STATUS.DRAFT,
    CONTRACT_STATUS.PENDING_APPROVAL,
    CONTRACT_STATUS.PENDING_PROCUREMENT,
    CONTRACT_STATUS.PENDING_LEGAL,
  ].includes(this.status);
};

// Method to check if contract accepts requests
contractSchema.methods.acceptsRequests = function () {
  return [CONTRACT_STATUS.PUBLISHED, CONTRACT_STATUS.SEARCHING_PROVIDER].includes(
    this.status
  );
};

// Method to transition status
contractSchema.methods.transitionTo = async function (newStatus, reason = null) {
  const validTransitions = {
    // New multi-step workflow
    [CONTRACT_STATUS.DRAFT]: [CONTRACT_STATUS.PENDING_PROCUREMENT],
    [CONTRACT_STATUS.PENDING_PROCUREMENT]: [
      CONTRACT_STATUS.PENDING_LEGAL,
      CONTRACT_STATUS.REJECTED,
      CONTRACT_STATUS.DRAFT,  // Allow edit and resubmit
    ],
    [CONTRACT_STATUS.PENDING_LEGAL]: [
      CONTRACT_STATUS.OPEN_FOR_OFFERS,
      CONTRACT_STATUS.REJECTED,
      CONTRACT_STATUS.PENDING_PROCUREMENT,  // Send back to procurement
    ],
    [CONTRACT_STATUS.OPEN_FOR_OFFERS]: [
      CONTRACT_STATUS.OFFER_SELECTED,
      CONTRACT_STATUS.CANCELLED,
    ],
    [CONTRACT_STATUS.OFFER_SELECTED]: [
      CONTRACT_STATUS.PENDING_FINAL_APPROVAL,
    ],
    [CONTRACT_STATUS.PENDING_FINAL_APPROVAL]: [
      CONTRACT_STATUS.FINAL_APPROVED,
      CONTRACT_STATUS.REJECTED,
      CONTRACT_STATUS.OFFER_SELECTED,  // Send back to coordinator
    ],
    [CONTRACT_STATUS.FINAL_APPROVED]: [
      CONTRACT_STATUS.COMPLETED,
      CONTRACT_STATUS.CANCELLED,
    ],
    // Legacy workflow transitions (for backward compatibility)
    [CONTRACT_STATUS.PENDING_APPROVAL]: [
      CONTRACT_STATUS.PUBLISHED,
      CONTRACT_STATUS.DRAFT,
    ],
    [CONTRACT_STATUS.PUBLISHED]: [
      CONTRACT_STATUS.SEARCHING_PROVIDER,
      CONTRACT_STATUS.CANCELLED,
    ],
    [CONTRACT_STATUS.SEARCHING_PROVIDER]: [
      CONTRACT_STATUS.PROVIDER_ASSIGNED,
      CONTRACT_STATUS.CANCELLED,
    ],
    [CONTRACT_STATUS.PROVIDER_ASSIGNED]: [
      CONTRACT_STATUS.IN_PROGRESS,
      CONTRACT_STATUS.SEARCHING_PROVIDER,
      CONTRACT_STATUS.CANCELLED,
    ],
    [CONTRACT_STATUS.IN_PROGRESS]: [
      CONTRACT_STATUS.COMPLETED,
      CONTRACT_STATUS.CANCELLED,
    ],
  };

  const allowed = validTransitions[this.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from ${this.status} to ${newStatus}`
    );
  }

  this.status = newStatus;

  // Set timestamps for specific statuses
  if (newStatus === CONTRACT_STATUS.PUBLISHED) {
    this.publishedAt = new Date();
  } else if (newStatus === CONTRACT_STATUS.OPEN_FOR_OFFERS) {
    this.openForOffersAt = new Date();
  } else if (newStatus === CONTRACT_STATUS.COMPLETED) {
    this.completedAt = new Date();
  } else if (newStatus === CONTRACT_STATUS.CANCELLED) {
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
  } else if (newStatus === CONTRACT_STATUS.REJECTED) {
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
  }

  await this.save();
  return this;
};

// Method to check if contract accepts offers (for public API)
contractSchema.methods.acceptsOffers = function () {
  return this.status === CONTRACT_STATUS.OPEN_FOR_OFFERS;
};

module.exports = mongoose.model('Contract', contractSchema);
