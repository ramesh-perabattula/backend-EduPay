const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Student = require('./models/Student');
const ExamNotification = require('./models/ExamNotification');
const LibraryRecord = require('./models/LibraryRecord');
const Payment = require('./models/Payment');
const SystemConfig = require('./models/SystemConfig');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const masterSeed = async () => {
    try {
        console.log('--- MASTER SEED STARTING ---');
        console.log('1. Clearing Database...');
        await User.deleteMany({});
        await Student.deleteMany({});
        await ExamNotification.deleteMany({});
        await LibraryRecord.deleteMany({});
        await Payment.deleteMany({});
        await SystemConfig.deleteMany({});
        console.log('   Database Cleared.');

        // ------------------------------------
        // 2. Create Admin & Staff Users
        // ------------------------------------
        console.log('2. Creating Staff Users...');
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash('123', salt); 
        // Note: User model pre-save hook handles hashing if we use .create, so passing plain '123'

        await User.create([
            { username: 'admin', password: '123', role: 'admin', name: 'System Admin', email: 'admin@college.edu' },
            { username: 'exam_head', password: '123', role: 'exam_head', name: 'Chief of Examinations', email: 'exam@college.edu' },
            { username: 'registrar', password: '123', role: 'registrar', name: 'Registrar', email: 'registrar@college.edu' }
        ]);

        // ------------------------------------
        // 3. Define Constants
        // ------------------------------------
        const departments = [
            { code: '01', name: 'CSE', mgmtFee: 200000 },
            { code: '03', name: 'MECH', mgmtFee: 120000 },
            { code: '04', name: 'ECE', mgmtFee: 150000 },
            { code: '05', name: 'CIVIL', mgmtFee: 120000 }
        ];

        // Format: USN Pattern = 25 + BatchPrefix + 1A + DeptCode + Serial
        const batches = [
            { name: '2022-2026', prefix: '22', targetYear: 4, sem: 8 },
            { name: '2023-2027', prefix: '23', targetYear: 3, sem: 6 },
            { name: '2024-2028', prefix: '24', targetYear: 2, sem: 4 },
            { name: '2025-2029', prefix: '25', targetYear: 1, sem: 2 }
        ];

        // ------------------------------------
        // 4. Initialize Function
        // ------------------------------------
        const createStudentsForBatch = async (batchConfig) => {
            console.log(`   Initializing Batch ${batchConfig.name} at Year 1...`);
            const students = [];

            for (const dept of departments) {
                for (let i = 1; i <= 25; i++) { // 25 students per dept
                    const serial = i.toString().padStart(3, '0');
                    // Change USN format to be readable: 1A01 for CSE? 
                    // Let's stick to the generated one: 25 + 22 + 1A + 01 + 001
                    const usn = `25${batchConfig.prefix}1A${dept.code}${serial}`; // e.g. 25221A01001

                    // Create User
                    const user = await User.create({
                        username: usn,
                        password: '123',
                        role: 'student',
                        name: `Student ${dept.name} ${batchConfig.prefix}-${serial}`,
                        email: `${usn.toLowerCase()}@bvce.edu`
                    });

                    // Determine Fee logic (simplified for variety)
                    const quota = i <= 10 ? 'government' : 'management';
                    const collegeFee = quota === 'government' ? 0 : dept.mgmtFee;

                    const transportOpted = i % 3 === 0; // 1 in 3
                    const transportFee = transportOpted ? 25000 : 0;

                    const hostelOpted = i % 5 === 0; // 1 in 5
                    const hostelFee = hostelOpted ? 80000 : 0;

                    const placementFee = 10000;

                    // Initial Fee Records (Year 1)
                    const feeRecords = [];
                    const addFee = (year, type, amount) => {
                        if (amount <= 0) return;
                        const split = Math.ceil(amount / 2);
                        feeRecords.push({ year, semester: (year * 2) - 1, feeType: type, amountDue: split, status: 'pending', amountPaid: 0, transactions: [] });
                        feeRecords.push({ year, semester: (year * 2), feeType: type, amountDue: amount - split, status: 'pending', amountPaid: 0, transactions: [] });
                    };

                    addFee(1, 'college', collegeFee);
                    if (transportOpted) addFee(1, 'transport', transportFee);
                    if (hostelOpted) addFee(1, 'hostel', hostelFee);
                    addFee(1, 'placement', placementFee);

                    const student = await Student.create({
                        user: user._id,
                        usn,
                        department: dept.name,
                        batch: batchConfig.name,
                        currentYear: 1, // Start at 1
                        quota,
                        entry: 'regular',
                        status: 'active',

                        transportOpted,
                        hostelOpted,
                        placementOpted: true,

                        annualCollegeFee: collegeFee,
                        annualTransportFee: transportFee,
                        annualHostelFee: hostelFee,
                        annualPlacementFee: placementFee,

                        // Current Dues (Year 1)
                        collegeFeeDue: collegeFee,
                        transportFeeDue: transportFee,
                        hostelFeeDue: hostelFee,
                        placementFeeDue: placementFee,

                        feeRecords
                    });
                    students.push(student);
                }
            }
            return students;
        };

        // ------------------------------------
        // 5. Helpers for Simulation
        // ------------------------------------
        const payAllDues = async (student, year) => {
            // Find pending records for this year
            const records = student.feeRecords.filter(r => r.year === year && r.status !== 'paid');
            for (const r of records) {
                if (r.amountDue > 0) {
                    r.status = 'paid';
                    r.amountPaid = r.amountDue;
                    r.transactions.push({
                        amount: r.amountDue,
                        date: new Date(),
                        mode: 'Simulated',
                        reference: `SIM-FEE-Y${year}`
                    });
                }
            }
            if (student.currentYear === year) {
                student.collegeFeeDue = 0;
                student.transportFeeDue = 0;
                student.hostelFeeDue = 0;
                student.placementFeeDue = 0;
            }
            await student.save();
        };

        const generateFeesForYear = async (student, year) => {
            const addFee = (type, amount) => {
                if (amount <= 0) return;
                const split = Math.ceil(amount / 2);
                student.feeRecords.push({ year, semester: (year * 2) - 1, feeType: type, amountDue: split, status: 'pending', amountPaid: 0, transactions: [] });
                student.feeRecords.push({ year, semester: (year * 2), feeType: type, amountDue: amount - split, status: 'pending', amountPaid: 0, transactions: [] });
            };

            addFee('college', student.annualCollegeFee);
            if (student.transportOpted) addFee('transport', student.annualTransportFee);
            if (student.hostelOpted) addFee('hostel', student.annualHostelFee);
            addFee('placement', student.annualPlacementFee);

            student.collegeFeeDue = student.annualCollegeFee;
            student.transportFeeDue = student.annualTransportFee;
            student.hostelFeeDue = student.annualHostelFee;
            student.placementFeeDue = student.annualPlacementFee;
            await student.save();
        };

        // ------------------------------------
        // 6. Execution Flow
        // ------------------------------------

        // A. Initialization: Create all students at Year 1
        console.log('3. Initializing All Batches at Year 1...');
        const allStudents = {}; // Map batchName -> [students]
        for (const b of batches) {
            allStudents[b.name] = await createStudentsForBatch(b);
        }

        // B. Simulation Loop: Iterate Years 1, 2, 3
        const maxYear = 4;

        for (let simYear = 1; simYear < maxYear; simYear++) {
            console.log(`4. Simulating Year ${simYear} Completion...`);

            // Which batches are active in this Sim Year?
            // A batch is active if its targetYear > simYear.
            // i.e. If I want to end up in Year 4, I must complete Year 1, 2, 3.

            const batchesToPromote = batches.filter(b => b.targetYear > simYear);
            if (batchesToPromote.length === 0) continue;

            const batchNames = batchesToPromote.map(b => b.name);
            console.log(`   Promoting Batches: ${batchNames.join(', ')}`);

            // 1. Create Exam Notification for this Level
            const notif = await ExamNotification.create({
                title: `End Semester Exam (Year ${simYear})`,
                year: simYear,
                targetBatches: batchNames,
                semester: simYear * 2,
                examFeeAmount: 1500,
                startDate: new Date(),
                endDate: new Date(),
                examType: 'regular',
                isActive: false // Expired
            });

            // 2. Process Students
            for (const bName of batchNames) {
                const students = allStudents[bName];
                for (const student of students) {
                    // a. Pay Monthly/Annual Fees for Current Year
                    await payAllDues(student, simYear);

                    // b. Pay Exam Fee
                    await Payment.create({
                        student: student._id,
                        amount: 1500,
                        paymentId: `PAY-EXAM-${student.usn}-Y${simYear}`,
                        status: 'completed',
                        paymentType: 'exam_fee',
                        metadata: { notificationId: notif._id, year: simYear }
                    });

                    // c. Promote to Next Year
                    student.currentYear = simYear + 1;
                    await generateFeesForYear(student, simYear + 1);
                }
            }
        }

        // ------------------------------------
        // 7. Create Active Notifications for Current States
        // ------------------------------------
        console.log('5. Creating Active Notifications & Final States...');
        for (const b of batches) {
            // Create an active exam notification for their CURRENT year
            await ExamNotification.create({
                title: `Semester ${b.sem} Finals (Active)`,
                year: b.targetYear,
                targetBatches: [b.name],
                semester: b.sem,
                examFeeAmount: 1500,
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000 * 10), // +10 days
                examType: 'regular',
                isActive: true
            });

            console.log(`   Batch ${b.name} is now in Year ${b.targetYear} (Sem ${b.sem}).`);
        }

        console.log('--- MASTER SEED COMPLETED ---');
        console.log('Credentials Hints:');
        console.log('Admin: admin / 123');
        console.log('Exam Head: exam_head / 123');
        console.log('Sample Students (Password: 123):');
        console.log('  2022-2026 (Year 4): 25221A01001 (CSE), 25221A05001 (CIVIL)');
        console.log('  2023-2027 (Year 3): 25231A01001');
        console.log('  2024-2028 (Year 2): 25241A01001');
        console.log('  2025-2029 (Year 1): 25251A01001');

        process.exit();

    } catch (error) {
        console.error('Master Seed Failed:', error);
        process.exit(1);
    }
};

masterSeed();
