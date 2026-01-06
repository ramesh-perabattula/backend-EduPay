const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const ExamNotification = require('./models/ExamNotification');
const LibraryRecord = require('./models/LibraryRecord');
const Payment = require('./models/Payment');
const SystemConfig = require('./models/SystemConfig');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const simpleSeed = async () => {
    try {
        console.log('--- SIMPLE SEED START ---');
        console.log('1. Clearing Database...');
        await User.deleteMany({});
        await Student.deleteMany({});
        await ExamNotification.deleteMany({});
        await Payment.deleteMany({});
        await LibraryRecord.deleteMany({});
        await SystemConfig.deleteMany({});
        console.log('   Data Cleared.');

        // ------------------------------------
        // 2. Create Staff Users
        // ------------------------------------
        console.log('2. Creating Staff Users...');
        await User.create([
            { username: 'admin', password: '123', role: 'admin', name: 'System Admin', email: 'admin@college.edu' },
            { username: 'exam_head', password: '123', role: 'exam_head', name: 'Chief of Exams', email: 'exam@college.edu' },
            { username: 'registrar', password: '123', role: 'registrar', name: 'Registrar', email: 'registrar@college.edu' }
        ]);

        // ------------------------------------
        // 3. Constants
        // ------------------------------------
        const departments = [
            { code: '01', name: 'CSE', mgmtFee: 220000 },
            { code: '03', name: 'MECH', mgmtFee: 120000 },
            { code: '04', name: 'ECE', mgmtFee: 150000 },
            { code: '05', name: 'CIVIL', mgmtFee: 120000 }
        ];

        const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Diya", "Saanvi", "Ananya", "Aadhya", "Pari", "Anika", "Navya", "Angel", "Shruti", "Riya"];
        const lastNames = ["Sharma", "Verma", "Gupta", "Malhotra", "Bhat", "Rao", "Reddy", "Nair", "Patel", "Mehta", "Singh", "Yadav", "Kumar", "Das", "Banerjee"];
        const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

        const batchName = '2022-2026';
        const batchPrefix = '22';
        const startYear = 1; // You requested 2022-2026 students, implying they started in 2022. 
        // BUT master plan was to "make them promote".
        // For simplicity requested now: "create 10 students in 2022-2026 batch".
        // I will initialize them in YEAR 1 so you can promote them manually/via simulation as requested before.
        // Or, if you want them properly placed in Year 4 immediately, I can do that.
        // Given "make them promote step by step" was the prev request, I will initialize them at YEAR 1.

        console.log(`3. Seeds Students for ${batchName} (Starting at Year 1)...`);

        for (const dept of departments) {
            console.log(`   Processing ${dept.name}...`);
            for (let i = 1; i <= 10; i++) { // 10 students per dept
                const serial = i.toString().padStart(3, '0');
                const usn = `25${batchPrefix}1A${dept.code}${serial}`; // e.g., 25221A01001

                // 30% Govt, 40% Mgmt, 30% NRI
                let quota = 'government';
                let collegeFee = 0;

                if (i <= 3) {
                    quota = 'government';
                    collegeFee = 0;
                } else if (i <= 7) {
                    quota = 'management';
                    collegeFee = dept.mgmtFee;
                } else {
                    quota = 'nri';
                    collegeFee = dept.mgmtFee * 2.5;
                }

                // Random Transport/Hostel
                const rand = Math.random();
                let transportOpted = false;
                let hostelOpted = false;

                if (rand < 0.4) transportOpted = true;
                else if (rand < 0.7) hostelOpted = true;

                const transportFee = transportOpted ? 30000 : 0;
                const hostelFee = hostelOpted ? 85000 : 0;
                const trainingFee = 15000; // Fixed for all

                const name = getRandomName();

                // Create User
                const user = await User.create({
                    username: usn,
                    password: '123',
                    role: 'student',
                    name: name,
                    email: `${name.replace(' ', '.').toLowerCase()}@bvce.edu`
                });

                // Create Fee Records for Year 1
                const feeRecords = [];
                const addFeeLog = (type, amount) => {
                    if (amount <= 0) return;
                    const split = Math.ceil(amount / 2);
                    feeRecords.push({ year: 1, semester: 1, feeType: type, amountDue: split, amountPaid: 0, status: 'pending', transactions: [] });
                    feeRecords.push({ year: 1, semester: 2, feeType: type, amountDue: amount - split, amountPaid: 0, status: 'pending', transactions: [] });
                };

                addFeeLog('college', collegeFee);
                addFeeLog('transport', transportFee);
                addFeeLog('hostel', hostelFee);
                addFeeLog('placement', trainingFee);

                await Student.create({
                    user: user._id,
                    usn: usn,
                    department: dept.name,
                    batch: batchName,
                    currentYear: 1, // Start at Year 1
                    quota: quota,
                    entry: 'regular',
                    status: 'active',

                    transportOpted,
                    transportRoute: transportOpted ? 'Regular Route' : '',
                    hostelOpted,
                    placementOpted: true,

                    annualCollegeFee: collegeFee,
                    annualTransportFee: transportFee,
                    annualHostelFee: hostelFee,
                    annualPlacementFee: trainingFee,

                    collegeFeeDue: collegeFee,
                    transportFeeDue: transportFee,
                    hostelFeeDue: hostelFee,
                    placementFeeDue: trainingFee,

                    feeRecords: feeRecords
                });
            }
        }

        console.log('--- SEED COMPLETED ---');
        console.log('Sample Credentials (Password: 123):');
        console.log('CSE Student 1: 25221A01001');
        console.log('MECH Student 1: 25221A03001');
        console.log('ECE Student 1: 25221A04001');
        console.log('CIVIL Student 1: 25221A05001');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

simpleSeed();
