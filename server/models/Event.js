const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String },
  description: { type: String },
  organizerEmail: { type: String, required: true, index: true }, // added organizer field
  createdAt: { type: Date, default: Date.now }
});

// Adding index for faster query on organizerEmail
eventSchema.index({ organizerEmail: 1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
