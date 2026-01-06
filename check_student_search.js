const mongoose = require('mongoose');
const Student = require('./models/Student');
const User = require('./models/User');

const checkStudent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        const testUsn = '22221A0401';
        console.log(`Searching for USN: ${testUsn}`);

        // Exact Search
        const exact = await Student.findOne({ usn: testUsn }).populate('user');
        console.log('Exact Match:', exact ? 'Found' : 'Not Found');
        if (exact) console.log('USN Case:', exact.usn);

        // Regex Search
        const regex = await Student.findOne({ usn: { $regex: testUsn, $options: 'i' } });
        console.log('Regex Match:', regex ? `Found ${regex.usn}` : 'Not Found');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
require('dotenv').config();
checkStudent();
