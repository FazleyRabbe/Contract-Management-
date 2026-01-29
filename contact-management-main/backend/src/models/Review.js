const mongoose = require('mongoose');
const { VALIDATION } = require('../config/constants');

const reviewSchema = new mongoose.Schema(
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
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [VALIDATION.MIN_RATING, `Minimum rating is ${VALIDATION.MIN_RATING}`],
      max: [VALIDATION.MAX_RATING, `Maximum rating is ${VALIDATION.MAX_RATING}`],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
    categories: {
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      quality: {
        type: Number,
        min: 1,
        max: 5,
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    response: {
      comment: String,
      createdAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure one review per contract
reviewSchema.index({ contract: 1, client: 1 }, { unique: true });

// Other indexes
reviewSchema.index({ serviceProvider: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ createdAt: -1 });

// After save - update service provider rating
reviewSchema.post('save', async function () {
  const ServiceProvider = mongoose.model('ServiceProvider');
  const provider = await ServiceProvider.findById(this.serviceProvider);
  if (provider) {
    await provider.updateRating(this.rating);
  }
});

// Static method to get reviews for a service provider
reviewSchema.statics.getProviderReviews = function (providerId, onlyPublic = true) {
  const query = { serviceProvider: providerId };
  if (onlyPublic) query.isPublic = true;

  return this.find(query)
    .populate('client', 'firstName lastName avatar')
    .populate('contract', 'title referenceNumber')
    .sort({ createdAt: -1 });
};

// Static method to get average ratings for a provider
reviewSchema.statics.getProviderAverageRatings = async function (providerId) {
  const result = await this.aggregate([
    { $match: { serviceProvider: mongoose.Types.ObjectId(providerId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        averageCommunication: { $avg: '$categories.communication' },
        averageQuality: { $avg: '$categories.quality' },
        averageTimeliness: { $avg: '$categories.timeliness' },
        averageProfessionalism: { $avg: '$categories.professionalism' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return result[0] || {
    averageRating: 0,
    averageCommunication: 0,
    averageQuality: 0,
    averageTimeliness: 0,
    averageProfessionalism: 0,
    totalReviews: 0,
  };
};

module.exports = mongoose.model('Review', reviewSchema);
