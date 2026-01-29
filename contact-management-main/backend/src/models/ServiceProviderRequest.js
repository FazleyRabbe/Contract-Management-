const mongoose = require('mongoose');
const { SP_REQUEST_STATUS } = require('../config/constants');

const serviceProviderRequestSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
    },
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      required: true,
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [200, 'Service name cannot exceed 200 characters'],
    },
    budget: {
      amount: {
        type: Number,
        required: [true, 'Budget is required'],
        min: [0, 'Budget cannot be negative'],
      },
      currency: {
        type: String,
        default: 'EUR',
      },
    },
    numberOfPersons: {
      type: Number,
      required: [true, 'Number of persons is required'],
      min: [1, 'Minimum 1 person required'],
      max: [20, 'Maximum 20 persons allowed'],
    },
    timeline: {
      startTime: {
        type: Date,
        required: [true, 'Start time is required'],
      },
      endTime: {
        type: Date,
        required: [true, 'End time is required'],
      },
    },
    deliverables: [{
      title: {
        type: String,
        required: true,
        trim: true,
      },
      description: String,
      dueDate: Date,
    }],
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(SP_REQUEST_STATUS),
      default: SP_REQUEST_STATUS.PENDING,
    },
    coverLetter: {
      type: String,
      maxlength: [1500, 'Cover letter cannot exceed 1500 characters'],
    },
    attachments: [{
      filename: String,
      originalName: String,
      path: String,
      mimetype: String,
      size: Number,
    }],
    clientNotes: String,
    rejectionReason: String,
    acceptedAt: Date,
    rejectedAt: Date,
    withdrawnAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to prevent duplicate requests
serviceProviderRequestSchema.index(
  { contract: 1, serviceProvider: 1 },
  { unique: true }
);

// Other indexes
serviceProviderRequestSchema.index({ contract: 1 });
serviceProviderRequestSchema.index({ serviceProvider: 1 });
serviceProviderRequestSchema.index({ status: 1 });
serviceProviderRequestSchema.index({ createdAt: -1 });

// Virtual for duration
serviceProviderRequestSchema.virtual('proposedDuration').get(function () {
  if (!this.timeline?.startTime || !this.timeline?.endTime) return null;
  const diffTime = Math.abs(this.timeline.endTime - this.timeline.startTime);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Validate timeline
serviceProviderRequestSchema.pre('save', function (next) {
  if (this.timeline?.startTime >= this.timeline?.endTime) {
    throw new Error('End time must be after start time');
  }
  next();
});

// Method to accept request
serviceProviderRequestSchema.methods.accept = async function (clientNotes = null) {
  this.status = SP_REQUEST_STATUS.ACCEPTED;
  this.acceptedAt = new Date();
  if (clientNotes) this.clientNotes = clientNotes;
  await this.save();
  return this;
};

// Method to reject request
serviceProviderRequestSchema.methods.reject = async function (reason = null) {
  this.status = SP_REQUEST_STATUS.REJECTED;
  this.rejectedAt = new Date();
  if (reason) this.rejectionReason = reason;
  await this.save();
  return this;
};

// Method to withdraw request
serviceProviderRequestSchema.methods.withdraw = async function () {
  if (this.status !== SP_REQUEST_STATUS.PENDING) {
    throw new Error('Only pending requests can be withdrawn');
  }
  this.status = SP_REQUEST_STATUS.WITHDRAWN;
  this.withdrawnAt = new Date();
  await this.save();
  return this;
};

// Static method to get requests for a contract
serviceProviderRequestSchema.statics.getContractRequests = function (contractId) {
  return this.find({ contract: contractId })
    .populate({
      path: 'serviceProvider',
      populate: { path: 'user', select: 'firstName lastName email avatar' },
    })
    .sort({ createdAt: -1 });
};

// Static method to get provider's requests
serviceProviderRequestSchema.statics.getProviderRequests = function (providerId) {
  return this.find({ serviceProvider: providerId })
    .populate('contract', 'title referenceNumber status budget')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('ServiceProviderRequest', serviceProviderRequestSchema);
