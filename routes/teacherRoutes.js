import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createClassroom,
  getTeacherClassrooms,
  getClassroomDetails,
  addStudentToClassroom,
  removeStudentFromClassroom,
  deleteClassroom,
  createAssignment,
  getAssignmentTracking,
  toggleAssignmentStatus,
  getCurriculumOptions,
  getSchoolStudents,
  bulkAddStudents,
  nudgePendingStudents,
} from '../controllers/teacherController.js';

const router = express.Router();

// All teacher routes require authentication
router.use(protect);

// Dynamic curriculum options from database (classes, subjects)
router.get('/curriculum-options', getCurriculumOptions);

// Classrooms
router.route('/classrooms')
  .post(createClassroom)
  .get(getTeacherClassrooms);

router.route('/classrooms/:id')
  .get(getClassroomDetails)
  .delete(deleteClassroom);

// Student management in classroom
router.post('/classrooms/:id/students', addStudentToClassroom);
router.delete('/classrooms/:id/students/:studentId', removeStudentFromClassroom);
router.get('/classrooms/:id/school-students', getSchoolStudents);
router.post('/classrooms/:id/bulk-add-students', bulkAddStudents);

// Assignments / Homework
router.post('/classrooms/:id/assignments', createAssignment);
router.get('/assignments/:assignmentId/tracking', getAssignmentTracking);
router.patch('/assignments/:assignmentId/status', toggleAssignmentStatus);
router.post('/assignments/:assignmentId/nudge-pending', nudgePendingStudents);

export default router;
