const mongoose = require('mongoose');

const logSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true }, // 'student', 'exam_notification', 'system'
    targetId: { type: String }, // Can be ObjectId or just a string identifier
    details: { type: mongoose.Schema.Types.Mixed }, // Structured object for old/new values
    ipAddress: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
