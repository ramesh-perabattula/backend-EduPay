const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedAdditionalBatches = async () => {
    try {
        console.log('--- SEEDING ADDITIONAL BATCHES (2023-2027, 2024-2028) ---');

        const departments = [
            { code: '01', name: 'CSE', mgmtFee: 220000 },
            { code: '03', name: 'MECH', mgmtFee: 120000 },
            { code: '04', name: 'ECE', mgmtFee: 150000 },
            { code: '05', name: 'CIVIL', mgmtFee: 120000 }
        ];

        const firstNames = ["Sarthak", "Pranav", "Rohan", "Kabir", "Arnav", "Ishita", "Tanya", "Meera", "Neha", "Pooja", "Vikram", "Rahul", "Simran", "Karan", "Sneha"];
        const lastNames = ["Joshi", "Kapoor", "Agarwal", "Iyer", "Nair", "Saxena", "Chopra", "Deshmukh", "Pillai", "Gowda", "Hegde", "Shetty", "Rai", "Mishra", "Tiwari"];

        const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

        const batches = [
            { name: '2023-2027', prefix: '23' },
            { name: '2024-2028', prefix: '24' } // Assuming 2024-2025 meant 2024-2028 or just Year 1 2024 batch
        ];

        for (const batch of batches) {
            console.log(`\nProcessing Batch ${batch.name}...`);

            for (const dept of departments) {
                console.log(`   -> Dept: ${dept.name}`);

                for (let i = 1; i <= 10; i++) { // 10 students per dept
                    const serial = i.toString().padStart(3, '0');
                    const usn = `25${batch.prefix}1A${dept.code}${serial}`; // e.g., 25231A01001

                    // Check if exists to avoid dupes if re-run
                    const exists = await Student.findOne({ usn });
                    if (exists) {
                        console.log(`      Skipping ${usn} (Exists)`);
                        continue;
                    }

                    // Varied Quota Logic
                    let quota = 'government';
                    let collegeFee = 0;

                    const randQuota = Math.random();
                    if (randQuota < 0.33) {
                        quota = 'government';
                        collegeFee = 0;
                    } else if (randQuota < 0.66) {
                        quota = 'management';
                        collegeFee = dept.mgmtFee;
                    } else {
                        quota = 'nri';
                        collegeFee = dept.mgmtFee * 2.5;
                    }

                    // Random Transport/Hostel
                    const randOpt = Math.random();
                    let transportOpted = false;
                    let hostelOpted = false;
                    let transportRoute = '';

                    if (randOpt < 0.3) {
                        transportOpted = true;
                        transportRoute = 'Route ' + Math.ceil(Math.random() * 10);
                    } else if (randOpt < 0.5) {
                        hostelOpted = true;
                    }

                    const transportFee = transportOpted ? 28000 : 0;
                    const hostelFee = hostelOpted ? 90000 : 0;
                    const trainingFee = 15000;

                    const name = getRandomName();

                    // Create User
                    const user = await User.create({
                        username: usn,
                        password: '123',
                        role: 'student',
                        name: name,
                        email: `${usn.toLowerCase()}@bvce.edu`
                    });

                    // Create Fee Records (Year 1)
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
                        batch: batch.name,
                        currentYear: 1, // Always Start at Year 1 as requested
                        quota: quota,
                        entry: 'regular',
                        status: 'active',

                        transportOpted,
                        transportRoute,
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
        }

        console.log('\n--- SEEDING COMPLETE ---');
        console.log('Sample Credentials (Password: 123):');
        console.log('2023-2027 CSE: 25231A01001');
        console.log('2024-2028 CSE: 25241A01001');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedAdditionalBatches();
