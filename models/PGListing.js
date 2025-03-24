// models/PGListing.js
const mongoose = require('mongoose');

const PGListingSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  gender: { type: String, enum: ['girls', 'boys'], required: true },
  description: { type: String },
  address: { type: String, required: true },
  wifi: { type: Boolean, default: false },
  monthlyFees: { type: Number, required: true },
  foodFees: { type: Number },
  roomsAvailable: { type: Number, required: true }, // new field
  images: [String],
  datePosted: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PGListing', PGListingSchema);
