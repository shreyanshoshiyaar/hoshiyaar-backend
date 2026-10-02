import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  joinClassroom,
  getStudentClassrooms,
  getStudentAssignments,
  leaveClassroom,
} from '../controllers/studentClassroomController.js';

const router = express.Router();

router.use(protect);

router.post('/join', joinClassroom);
router.get('/', getStudentClassrooms);
router.get('/assignments', getStudentAssignments);
router.post('/:id/leave', leaveClassroom);

export default router;
