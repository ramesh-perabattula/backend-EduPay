const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const createMissingHeads = async () => {
    try {
        console.log('Checking and Creating Missing Department Heads...');

        const neededUsers = [
            { username: 'principal', role: 'principal', name: 'Principal', email: 'principal@college.edu' },
            { username: 'admission_officer', role: 'admission_officer', name: 'Admission Officer', email: 'admission@college.edu' },
            { username: 'transport', role: 'transport_dept', name: 'Transport Officer', email: 'transport@college.edu' },
            { username: 'placement_officer', role: 'placement_officer', name: 'Placement Officer', email: 'placement@college.edu' },
            { username: 'hostel_manager', role: 'hostel_manager', name: 'Hostel Manager', email: 'hostel@college.edu' }
        ];

        for (const u of neededUsers) {
            const exists = await User.findOne({ role: u.role });
            if (!exists) {
                console.log(`Creating ${u.role}...`);
                await User.create({
                    username: u.username,
                    password: '123', // Will be hashed by pre-save
                    role: u.role,
                    name: u.name,
                    email: u.email
                });
                console.log(` -> Created: ${u.username} / 123`);
            } else {
                console.log(` -> Exists: ${exists.username} (${u.role})`);
            }
        }

        console.log('Done.');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createMissingHeads();
