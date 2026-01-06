require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Student = require('./models/Student');
const Payment = require('./models/Payment');
const LibraryRecord = require('./models/LibraryRecord');
// const ExamNotification = require('./models/ExamNotification'); // Keep notifications? "Clear students". Notifications are admin data. I'll keep them.

const ROLES_TO_PRESERVE = [
    'admin', 'principal', 'exam_head', 'transport_dept', 'registrar',
    'librarian', 'placement_officer', 'hostel_manager', 'admission_officer'
];

const HEADS = [
    { username: 'admin', role: 'admin', name: 'System Admin' },
    { username: 'principal', role: 'principal', name: 'Dr. Principal' },
    { username: 'registrar', role: 'registrar', name: 'Registrar Officer' },
    { username: 'exam_head', role: 'exam_head', name: 'Controller of Examinations' },
    { username: 'librarian', role: 'librarian', name: 'Chief Librarian' },
    { username: 'transport_manager', role: 'transport_dept', name: 'Transport Manager' },
    { username: 'hostel_manager', role: 'hostel_manager', name: 'Hostel Manager' },
    { username: 'placement_officer', role: 'placement_officer', name: 'Placement Officer' },
    { username: 'admission_officer', role: 'admission_officer', name: 'Admission Head' },
];

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Delete ALL Students (Profiles)
        const deleteStudents = await Student.deleteMany({});
        console.log(`Deleted ${deleteStudents.deletedCount} Student Profiles`);

        // 2. Delete ALL Users with role 'student'
        const deleteUsers = await User.deleteMany({ role: 'student' });
        console.log(`Deleted ${deleteUsers.deletedCount} Student Users`);

        // 3. Delete Linked Data
        await Payment.deleteMany({}); // Student data
        console.log('Deleted Payments');

        await LibraryRecord.deleteMany({}); // Student data
        console.log('Deleted Library Records');

        // 4. Upsert Heads
        for (const head of HEADS) {
            const exists = await User.findOne({ username: head.username });
            if (!exists) {
                console.log(`Creating ${head.role}: ${head.username}`);
                await User.create({
                    username: head.username,
                    password: 'password123', // Default Password
                    name: head.name,
                    role: head.role,
                    email: `${head.username}@bvce.edu`
                });
            } else {
                console.log(`Preserved ${head.role}: ${head.username}`);
                // Ensure role is correct if username exists (just in case)
                if (exists.role !== head.role) {
                    exists.role = head.role;
                    await exists.save();
                    console.log(` -> Fixed role for ${head.username}`);
                }
            }
        }

        console.log('Database reset complete. Staff accounts preserved/created.');

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
