const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const debug = async () => {
    try {
        console.log('--- DB DEBUG START ---');
        const userCount = await User.countDocuments();
        const studentCount = await Student.countDocuments();
        console.log(`Total Users: ${userCount}`);
        console.log(`Total Students: ${studentCount}`);

        if (studentCount > 0) {
            const sampleStudents = await Student.find().populate('user').limit(5);
            console.log('\nSample Students:');
            sampleStudents.forEach(s => {
                console.log(`- USN: ${s.usn} | Batch: ${s.batch} | Year: ${s.currentYear} | User: ${s.user ? s.user.username : 'NULL'}`);
            });
        } else {
            console.log('No students found!');
        }
        console.log('--- DB DEBUG END ---');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debug();
