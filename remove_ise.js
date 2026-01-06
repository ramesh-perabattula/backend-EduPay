const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const removeISEStudents = async () => {
    try {
        console.log('Finding ISE students...');
        const iseStudents = await Student.find({ department: 'ISE' });

        if (iseStudents.length === 0) {
            console.log('No ISE students found.');
            process.exit();
        }

        const userIds = iseStudents.map(s => s.user);

        console.log(`Found ${iseStudents.length} ISE students. Removing...`);

        // Remove Students
        await Student.deleteMany({ department: 'ISE' });

        // Remove associated Users
        await User.deleteMany({ _id: { $in: userIds } });

        console.log('Successfully removed all ISE students and their user accounts.');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

removeISEStudents();
