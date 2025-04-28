const mongoose = require('mongoose');

const classifiedSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, enum: ['For Sale', 'Services', 'Jobs'], required: true },
    price: { type: Number },
    postedBy: { 
        username: { type: String, required: true },
        email: { type: String, required: true }
    },
    photos: [{ type: String }], // Array of base64 or image URLs
    createdAt: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    isAd: { type: Boolean, default: false } // if it's an Ad (yellow AD label)
});

const Classified = mongoose.model('Classified', classifiedSchema);
module.exports = Classified;
