import express from 'express';
import { getStudentsByIds, getAllStudents, testConnection } from '../controllers/studentController.js';

const router = express.Router();

// Test database connection
router.get('/test-connection', testConnection);

// Get students by IDs (for advisor's assigned students)
router.post('/by-ids', getStudentsByIds);

// Get all students (for admin purposes)
router.get('/all', getAllStudents);

export default router; 