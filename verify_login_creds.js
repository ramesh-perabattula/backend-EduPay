const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const checkCreds = async () => {
    try {
        console.log('--- CHECKING CREDENTIALS ---');

        // Find one student
        const student = await Student.findOne().populate('user');
        if (!student) {
            console.log('No students found!');
        } else {
            console.log(`Valid Student Credential Check:`);
            console.log(`Username (USN): ${student.user.username}`);
            console.log(`Role: ${student.user.role}`);
            // We can't see the password (hashed), but we can verify if '123' matches
            const isMatch = await student.user.matchPassword('123');
            console.log(`Password '123' works: ${isMatch}`);
        }

        // Find Admin
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            console.log(`\nValid Admin Credential Check:`);
            console.log(`Username: ${admin.username}`);
            // Check password 'admin123' which is default in seeder
            const isMatch = await admin.matchPassword('admin123');
            console.log(`Password 'admin123' works: ${isMatch}`);
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

setTimeout(checkCreds, 2000);
