const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const clearUpcoming = async () => {
    try {
        console.log('--- CLEARING ACTIVE/UPCOMING NOTIFICATIONS ---');

        const now = new Date();

        // We want to KEEP only notifications that are 'already over' (endDate < now).
        // So we DELETE notifications where endDate >= now.

        const result = await ExamNotification.deleteMany({
            endDate: { $gte: now }
        });

        console.log(`Deleted ${result.deletedCount} active/upcoming notifications.`);
        console.log('Only historical (expired) notifications remain.');

        process.exit();
    } catch (error) {
        console.error('Error clearing notifications:', error);
        process.exit(1);
    }
};

clearUpcoming();
