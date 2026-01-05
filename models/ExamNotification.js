const mongoose = require('mongoose');

const examNotificationSchema = mongoose.Schema({
    title: { type: String, required: true },
    year: { type: Number, required: true }, // Target Year (1, 2, 3, 4)
    targetBatches: { type: [String], required: true }, // Target Batches (Array)
    semester: { type: Number }, // Optional specific semester
    examFeeAmount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }, // Last date without fine
    lastDateWithoutFine: { type: Date },
    lateFee: { type: Number, default: 0 },
    description: { type: String },
    examType: { type: String, enum: ['regular', 'supplementary'], default: 'regular' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ExamNotification', examNotificationSchema);
