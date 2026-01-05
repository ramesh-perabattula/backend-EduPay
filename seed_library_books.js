const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const LibraryRecord = require('./models/LibraryRecord');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seedLibraryBooks = async () => {
    try {
        console.log('--- SEEDING LIBRARY RECORDS ---');

        // Book Repository by Branch
        const books = {
            'CSE': [
                "Computer Networks (Tanenbaum)", "Operating System Concepts (Galvin)",
                "Introduction to Algorithms (CLRS)", "Clean Code (Robert Martin)",
                "Pragmatic Programmer", "Artificial Intelligence: A Modern Approach",
                "Database System Concepts", "Automata Theory", "Compiler Design (Ullman)"
            ],
            'ECE': [
                "Digital Signal Processing (Proakis)", "Microelectronic Circuits (Sedra/Smith)",
                "Electronic Devices (Boylestad)", "Signals and Systems (Oppenheim)",
                "Communication Systems (Haykin)", "Control Systems Engineering (Nise)",
                "VLSI Design", "Antenna Theory"
            ],
            'MECH': [
                "Engineering Thermodynamics (Nag)", "Fluid Mechanics (Cengel)",
                "Strength of Materials (Timoshenko)", "Theory of Machines (Rattan)",
                "Machine Design (Shigley)", "Heat Transfer (Incropera)",
                "Manufacturing Processes", "Robotics and Control"
            ],
            'CIVIL': [
                "Structural Analysis (Hibbeler)", "Soil Mechanics (Terzaghi)",
                "Fluid Mechanics (Modi & Seth)", "Surveying (Punmia)",
                "Concrete Technology", "Transportation Engineering (Khanna)",
                "Environmental Engineering", "Design of Steel Structures"
            ]
        };

        // Clear existing records (optional, maybe keep it clean)
        // console.log("Cleaning existing library records...");
        // await LibraryRecord.deleteMany({}); 

        // Departments to process
        const depts = ['CSE', 'ECE', 'MECH', 'CIVIL'];

        for (const dept of depts) {
            const students = await Student.find({ department: dept });
            console.log(`Processing ${dept}: found ${students.length} students.`);

            if (students.length === 0) continue;

            // Assign books to 40% of students
            const targetCount = Math.floor(students.length * 0.4);
            const selectedStudents = students.sort(() => 0.5 - Math.random()).slice(0, targetCount);

            for (const student of selectedStudents) {
                // Assign 1 or 2 books
                const numBooks = Math.floor(Math.random() * 2) + 1;
                const deptBooks = books[dept] || books['CSE']; // Fallback

                for (let i = 0; i < numBooks; i++) {
                    const randomBook = deptBooks[Math.floor(Math.random() * deptBooks.length)];
                    const bookId = `LIB-${dept}-${Math.floor(Math.random() * 10000)}`;

                    // Determine Status: Borrowed or Overdue
                    const isOverdue = Math.random() > 0.7;
                    const daysAgo = isOverdue ? 30 : 10;

                    const borrowedDate = new Date();
                    borrowedDate.setDate(borrowedDate.getDate() - daysAgo);

                    const dueDate = new Date();
                    dueDate.setDate(borrowedDate.getDate() + 15); // 15 days loan period

                    await LibraryRecord.create({
                        student: student._id,
                        usn: student.usn,
                        bookTitle: randomBook,
                        bookId: bookId,
                        borrowedDate: borrowedDate,
                        dueDate: dueDate,
                        status: isOverdue ? 'overdue' : 'borrowed',
                        fine: isOverdue ? (Math.floor(Math.random() * 50) + 10) : 0, // Random fine 10-60
                        remarks: isOverdue ? 'Return immediately' : ''
                    });
                }
            }
            console.log(`   -> Assigned books to ${targetCount} students in ${dept}.`);
        }

        console.log('--- LIBRARY SEED COMPLETE ---');
        process.exit();

    } catch (error) {
        console.error('Error seeding library:', error);
        process.exit(1);
    }
};

seedLibraryBooks();
