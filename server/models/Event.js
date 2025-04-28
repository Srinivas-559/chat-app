const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String },
  description: { type: String },
  organizerEmail: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  rsvpDeadline: { type: Date, default: Date.now },
  photos: [{ type: String }], // array of base64 encoded strings
  messagingUrl: { type: String }, // messaging URL
});

// Adding index for faster query on organizerEmail
eventSchema.index({ organizerEmail: 1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
