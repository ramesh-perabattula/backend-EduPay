const Log = require('../models/Log');

/**
 * Creates an audit log entry.
 * @param {Object} params - The log parameters.
 * @param {string} params.userId - The ID of the user performing the action.
 * @param {string} params.role - The role of the user (e.g., admin, exam_head).
 * @param {string} params.action - A string describing the action (e.g., LOGIN, UPDATE_FEE).
 * @param {string} params.targetType - The type of object affected (e.g., Student, ExamNotification).
 * @param {string} params.targetId - The ID of the affected object (optional).
 * @param {Object} params.details - Detailed changes or context (oldVal, newVal).
 * @param {string} params.ipAddress - The IP address of the request.
 */
const createLog = async ({ userId, role, action, targetType, targetId, details, ipAddress }) => {
    try {
        // Only log if userId is provided
        if (!userId) return;

        await Log.create({
            user: userId,
            role,
            action,
            targetType,
            targetId: targetId ? targetId.toString() : null,
            details,
            ipAddress
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
        // We do not throw error to avoid blocking the main operation
    }
};

module.exports = { createLog };
