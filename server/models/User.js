const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  socketId: String,
});

module.exports = mongoose.model('User', userSchema);
