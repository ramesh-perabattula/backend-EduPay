require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Create User
        const username = '12345TEST';
        let user = await User.findOne({ username });
        if (!user) {
            user = await User.create({
                username,
                password: 'password',
                name: 'Test Student Search',
                role: 'student',
                email: 'test@test.com'
            });
            console.log('Created User');
        }

        // Create Student
        let student = await Student.findOne({ usn: username });
        if (!student) {
            student = await Student.create({
                user: user._id,
                usn: username,
                department: 'CSE',
                batch: '2024-2028',
                currentYear: 1,
                quota: 'management',
                entry: 'regular',
                collegeFeeDue: 1000
            });
            console.log('Created Student');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
