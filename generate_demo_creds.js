const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const generateCreds = async () => {
    try {
        console.log('Generating Demo Credentials File...');
        let content = `# 🎓 EduPay Demo Credentials\n\n`;
        content += `**Universal Password for ALL Accounts:** \`123\`\n\n`;
        content += `> **Note:** Use these credentials to demonstrate different user roles and student scenarios.\n\n`;

        // 1. System Admins & Heads
        content += `## 🔑 Administration & Staff\n\n`;
        content += `| Role | Username | Description |\n`;
        content += `|---|---|---|\n`;

        const roles = [
            { role: 'admin', label: 'System Admin' },
            { role: 'principal', label: 'Principal' },
            { role: 'exam_head', label: 'Exam Section Head' },
            { role: 'registrar', label: 'Registrar (Enrollment)' },
            { role: 'admission_officer', label: 'Admission Officer' },
            { role: 'transport_dept', label: 'Transport Dept' },
            { role: 'librarian', label: 'Librarian' },
            { role: 'placement_officer', label: 'Placement Officer' },
            { role: 'hostel_manager', label: 'Hostel Manager' },
        ];

        for (const r of roles) {
            const u = await User.findOne({ role: r.role });
            if (u) {
                content += `| **${r.label}** | \`${u.username}\` | Full access to ${r.label} dashboard |\n`;
            } else {
                content += `| **${r.label}** | *(Not Found)* | -- |\n`;
            }
        }
        content += `\n---\n\n`;

        // 2. Students by Year & Category
        content += `## 🎓 Student Portals\n`;
        content += `Students are categorized by Year and Quota to show different fee structures.\n\n`;

        const quotas = ['government', 'management', 'nri'];
        const years = [1, 2, 3, 4];

        for (const year of years) {
            content += `### Year ${year} Students\n`;
            content += `| Quota | USN (Username) | Name | Dept | Fee Status |\n`;
            content += `|---|---|---|---|---|\n`;

            for (const quota of quotas) {
                const s = await Student.findOne({ currentYear: year, quota: quota }).populate('user');
                if (s) {
                    const feeStatus = s.collegeFeeDue > 0 ? '🔴 Has Dues' : '🟢 Paid';
                    content += `| ${quota.charAt(0).toUpperCase() + quota.slice(1)} | \`${s.usn}\` | ${s.user.name} | ${s.department} | ${feeStatus} |\n`;
                } else {
                    // Try to find ANY student if specific quota missing
                    if (quota === 'government') {
                        const anyS = await Student.findOne({ currentYear: year }).populate('user');
                        if (anyS) {
                            content += `| Any (${anyS.quota}) | \`${anyS.usn}\` | ${anyS.user.name} | ${anyS.department} | (Backup Selection) |\n`;
                        } else {
                            content += `| ${quota} | *(No Data)* | - | - | - |\n`;
                        }
                    }
                }
            }
            content += `\n`;
        }

        // 3. Special Scenarios
        content += `### 🧪 Special Scenarios\n\n`;

        // Find a student with Library Dues
        // We need to query LibraryRecord directly first
        const LibraryRecord = require('./models/LibraryRecord');
        const libRecord = await LibraryRecord.findOne({ status: 'overdue' });
        if (libRecord) {
            const libStudent = await Student.findById(libRecord.student).populate('user');
            if (libStudent) {
                content += `- **Library Defaulter:** \`${libStudent.usn}\` (${libStudent.user.name}) - Has overdue books (Verify Red Dashboard Status).\n`;
            }
        }

        // Find a student with Transport
        const transportStudent = await Student.findOne({ transportOpted: true }).populate('user');
        if (transportStudent) {
            content += `- **Bus Traveler:** \`${transportStudent.usn}\` (${transportStudent.user.name}) - Has Transport Fee tab enabled.\n`;
        }

        // Find a student with Hostel
        const hostelStudent = await Student.findOne({ hostelOpted: true }).populate('user');
        if (hostelStudent) {
            content += `- **Hostelite:** \`${hostelStudent.usn}\` (${hostelStudent.user.name}) - Has Hostel Fee tab enabled.\n`;
        }

        fs.writeFileSync('DEMO_CREDENTIALS.md', content);
        console.log('File created: DEMO_CREDENTIALS.md');
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

generateCreds();
