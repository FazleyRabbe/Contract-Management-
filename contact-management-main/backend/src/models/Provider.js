const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    // Provider name (company or individual)
    name: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    // Parent organization (if any)
    organization: {
      type: String,
      trim: true,
      maxlength: [200, 'Organization cannot exceed 200 characters'],
    },
    // Email for contact
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    // Service type or category
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
    },
    // List of skill tags
    tags: [{
      type: String,
      trim: true,
    }],
    // Rating (float, 0-5)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    // Number of ratings/reviews
    reviewsCount: {
      type: Number,
      default: 0,
    },
    // Number of tasks completed
    tasksCompleted: {
      type: Number,
      default: 0,
    },
    // Hourly rate range
    rateMin: {
      type: Number,
      default: 0,
      min: 0,
    },
    rateMax: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Availability status
    availability: {
      type: Boolean,
      default: true,
    },
    // Verification status
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Additional contact info (optional)
    phone: {
      countryCode: {
        type: String,
        default: '+49',
      },
      number: {
        type: String,
        trim: true,
      },
    },
    // Address (optional)
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Germany',
      },
    },
    // Description
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // Website (optional)
    website: {
      type: String,
      trim: true,
    },
    // Activity status (for soft delete)
    isActive: {
      type: Boolean,
      default: true,
    },
    // Notes (internal admin notes)
    adminNotes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
providerSchema.index({ email: 1 });
providerSchema.index({ name: 1 });
providerSchema.index({ category: 1 });
providerSchema.index({ isActive: 1 });
providerSchema.index({ verified: 1 });
providerSchema.index({ availability: 1 });
providerSchema.index({ rating: -1 });
providerSchema.index({ createdAt: -1 });
providerSchema.index({ name: 'text', description: 'text', category: 'text' });

// Virtual for full phone
providerSchema.virtual('fullPhone').get(function () {
  if (!this.phone?.number) return null;
  return `${this.phone.countryCode}${this.phone.number}`;
});

// Virtual for rate range display
providerSchema.virtual('rateRange').get(function () {
  if (this.rateMin === 0 && this.rateMax === 0) return null;
  return `${this.rateMin} - ${this.rateMax} EUR/hr`;
});

// Method to increment tasks completed
providerSchema.methods.incrementTasksCompleted = async function () {
  this.tasksCompleted += 1;
  await this.save();
  return this;
};

// Method to update rating
providerSchema.methods.updateRating = async function (newRating) {
  const currentTotal = this.rating * this.reviewsCount;
  this.reviewsCount += 1;
  this.rating = (currentTotal + newRating) / this.reviewsCount;
  await this.save();
  return this;
};

// Method to verify provider
providerSchema.methods.verify = async function (userId) {
  this.verified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = userId;
  await this.save();
  return this;
};

// Method to set availability
providerSchema.methods.setAvailability = async function (isAvailable) {
  this.availability = isAvailable;
  await this.save();
  return this;
};

// Static method to find or create provider by email
providerSchema.statics.findOrCreate = async function (providerData) {
  let provider = await this.findOne({ email: providerData.email.toLowerCase() });

  if (!provider) {
    provider = await this.create(providerData);
  }

  return provider;
};

// Static method to find active providers
providerSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isActive: true });
};

// Static method to find available providers
providerSchema.statics.findAvailable = function (filter = {}) {
  return this.find({ ...filter, isActive: true, availability: true });
};

module.exports = mongoose.model('Provider', providerSchema);
