import Classroom from '../models/Classroom.js';
import Assignment from '../models/Assignment.js';
import User from '../models/User.js';
import { sendPushNotification } from '../services/notificationService.js';

// @desc    Join a classroom using a 6-character unique code
// @route   POST /api/student/classrooms/join
// @access  Private
export const joinClassroom = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Please provide a valid classroom code' });
    }

    const cleanCode = code.trim().toUpperCase();
    const classroom = await Classroom.findOne({ code: cleanCode, isActive: true })
      .populate('teacherId', 'name username school');

    if (!classroom) {
      return res.status(404).json({ message: 'Invalid classroom code. Please check with your teacher.' });
    }

    const studentId = req.user._id;

    // Check if already in this classroom
    const isAlreadyMember = classroom.students.some(s => s.toString() === studentId.toString());
    if (isAlreadyMember) {
      return res.status(400).json({
        message: `You are already enrolled in ${classroom.name}`,
        classroom: {
          _id: classroom._id,
          name: classroom.name,
          subject: classroom.subject,
          classLevel: classroom.classLevel,
          teacherName: classroom.teacherId?.name || classroom.teacherId?.username || 'Teacher',
        },
      });
    }

    // Add student to classroom
    classroom.students.push(studentId);
    await classroom.save();

    // Add classroom to user's enrolledClassrooms
    await User.findByIdAndUpdate(studentId, {
      $addToSet: { enrolledClassrooms: classroom._id },
    });

    // Notify the student (welcome push confirmation)
    if (req.user.fcmToken) {
      sendPushNotification(
        req.user.fcmToken,
        `🎉 Welcome to ${classroom.name}!`,
        `You've joined ${classroom.name} (${classroom.subject || 'Science'}). Check your classroom tab for homework and fun missions!`,
        {
          url: '/homework',
          type: 'classroom_joined',
          classroomId: classroom._id.toString(),
        }
      ).catch(e => console.error('Student welcome push failed:', e.message));
    }

    return res.json({
      success: true,
      message: `Successfully joined ${classroom.name}!`,
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        code: classroom.code,
        subject: classroom.subject,
        classLevel: classroom.classLevel,
        teacherName: classroom.teacherId?.name || classroom.teacherId?.username || 'Teacher',
      },
    });
  } catch (error) {
    console.error('🔥 Error joining classroom:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Get all classrooms student is enrolled in
// @route   GET /api/student/classrooms
// @access  Private
export const getStudentClassrooms = async (req, res) => {
  try {
    const studentId = req.user._id;
    const classrooms = await Classroom.find({
      students: studentId,
      isActive: true,
    })
      .populate('teacherId', 'name username school phone')
      .sort({ createdAt: -1 })
      .lean();

    // Attach active assignment counts
    const classroomIds = classrooms.map(c => c._id);
    const assignments = await Assignment.find({
      classroomId: { $in: classroomIds },
      status: 'active',
    }).select('classroomId').lean();

    const countMap = {};
    assignments.forEach(a => {
      const cid = a.classroomId.toString();
      countMap[cid] = (countMap[cid] || 0) + 1;
    });

    const enriched = classrooms.map(c => ({
      _id: c._id,
      name: c.name,
      code: c.code,
      subject: c.subject,
      classLevel: c.classLevel,
      school: c.school || c.teacherId?.school || '',
      teacherName: c.teacherId?.name || c.teacherId?.username || 'Teacher',
      studentCount: c.students?.length || 0,
      activeAssignmentsCount: countMap[c._id.toString()] || 0,
    }));

    return res.json({
      success: true,
      classrooms: enriched,
    });
  } catch (error) {
    console.error('🔥 Error fetching student classrooms:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Get all active homework assignments for the student with individual completion status
// @route   GET /api/student/assignments
// @access  Private
export const getStudentAssignments = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Fetch student's fresh chaptersProgress to evaluate completed modules
    const user = await User.findById(studentId).select('chaptersProgress enrolledClassrooms').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find classrooms student is in
    const classrooms = await Classroom.find({
      students: studentId,
      isActive: true,
    }).select('_id name subject teacherId').populate('teacherId', 'name username').lean();

    const classroomMap = {};
    const classroomIds = classrooms.map(c => {
      classroomMap[c._id.toString()] = {
        name: c.name,
        subject: c.subject,
        teacherName: c.teacherId?.name || c.teacherId?.username || 'Teacher',
      };
      return c._id;
    });

    if (classroomIds.length === 0) {
      return res.json({
        success: true,
        assignments: [],
      });
    }

    // Find active assignments
    const assignments = await Assignment.find({
      classroomId: { $in: classroomIds },
      status: 'active',
    })
      .sort({ dueDate: 1 })
      .lean();

    // Build completed modules set
    const completedSet = new Set();
    if (Array.isArray(user.chaptersProgress)) {
      user.chaptersProgress.forEach(cp => {
        if (Array.isArray(cp.completedModules)) {
          cp.completedModules.forEach(mid => completedSet.add(String(mid)));
        }
      });
    }

    // Enrich assignments with student's personal completion progress
    const now = new Date();
    const enriched = assignments.map(a => {
      const targetLessons = a.targetLessons || [];
      const totalTargets = targetLessons.length;

      const lessonsWithStatus = targetLessons.map(l => ({
        moduleId: l.moduleId,
        title: l.title,
        order: l.order,
        isCompleted: completedSet.has(l.moduleId.toString()),
      }));

      const completedCount = lessonsWithStatus.filter(l => l.isCompleted).length;
      const isCompleted = totalTargets > 0 && completedCount === totalTargets;
      const progressPercent = totalTargets > 0 ? Math.round((completedCount / totalTargets) * 100) : 0;
      const isOverdue = now > new Date(a.dueDate);

      const classInfo = classroomMap[a.classroomId.toString()] || {};

      return {
        _id: a._id,
        classroomId: a.classroomId,
        classroomName: classInfo.name || 'Classroom',
        subject: classInfo.subject || 'Science',
        teacherName: classInfo.teacherName || 'Teacher',
        title: a.title,
        instructions: a.instructions,
        chapterId: a.chapterId,
        chapterTitle: a.chapterTitle,
        dueDate: a.dueDate,
        isOverdue,
        totalTargets,
        completedCount,
        progressPercent,
        isCompleted,
        lessons: lessonsWithStatus,
      };
    });

    return res.json({
      success: true,
      assignments: enriched,
    });
  } catch (error) {
    console.error('🔥 Error fetching student assignments:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Leave a classroom
// @route   POST /api/student/classrooms/:id/leave
// @access  Private
export const leaveClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    await Classroom.findByIdAndUpdate(id, {
      $pull: { students: studentId },
    });

    await User.findByIdAndUpdate(studentId, {
      $pull: { enrolledClassrooms: id },
    });

    return res.json({
      success: true,
      message: 'Left classroom successfully',
    });
  } catch (error) {
    console.error('🔥 Error leaving classroom:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};
