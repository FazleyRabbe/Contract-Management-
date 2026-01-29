const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');

const serviceProviderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    coreRole: {
      type: String,
      required: [true, 'Core role is required'],
      trim: true,
      maxlength: [100, 'Core role cannot exceed 100 characters'],
    },
    expertise: [{
      type: String,
      trim: true,
    }],
    bio: {
      type: String,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    hourlyRate: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: 'EUR',
      },
    },
    availability: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available',
    },
    completedTasks: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    portfolio: [{
      title: String,
      description: String,
      url: String,
      image: String,
    }],
    certifications: [{
      name: String,
      issuer: String,
      year: Number,
      url: String,
    }],
    languages: [{
      language: String,
      proficiency: {
        type: String,
        enum: ['basic', 'intermediate', 'fluent', 'native'],
      },
    }],
    workHistory: [{
      contractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contract',
      },
      clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      title: String,
      completedAt: Date,
      rating: Number,
      review: String,
    }],
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
serviceProviderSchema.index({ user: 1 });
serviceProviderSchema.index({ coreRole: 'text', expertise: 'text' });
serviceProviderSchema.index({ 'rating.average': -1 });
serviceProviderSchema.index({ completedTasks: -1 });
serviceProviderSchema.index({ isActive: 1, isVerified: 1 });

// Virtuals
serviceProviderSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
});

// Calculate average rating
serviceProviderSchema.methods.updateRating = async function (newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  await this.save();
};

// Increment completed tasks
serviceProviderSchema.methods.incrementCompletedTasks = async function () {
  this.completedTasks += 1;
  await this.save();
};

// Add work history entry
serviceProviderSchema.methods.addWorkHistory = async function (workEntry) {
  this.workHistory.push(workEntry);
  await this.save();
};

// Pre-save middleware to ensure user has service_provider role
serviceProviderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.user, { role: ROLES.SERVICE_PROVIDER });
  }
  next();
});

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
