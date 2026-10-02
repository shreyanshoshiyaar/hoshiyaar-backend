import Classroom from '../models/Classroom.js';
import Assignment from '../models/Assignment.js';
import User from '../models/User.js';
import ClassLevel from '../models/ClassLevel.js';
import Subject from '../models/Subject.js';
import crypto from 'crypto';
import {
  sendClassroomEnrolledNotification,
  sendClassroomBulkEnrolledNotifications,
  sendHomeworkAssignedNotification,
  sendManualNudgeToPendingStudents,
} from '../services/notificationService.js';

// Helper to generate a unique 6-character alphanumeric code (excluding 0/O, 1/I)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
async function generateUniqueCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    }
    const exists = await Classroom.findOne({ code });
    if (!exists) return code;
  }
  // Fallback with timestamp suffix
  return 'HY' + Date.now().toString(36).toUpperCase().slice(-4);
}

// Format date in IST
function toISTDateString(dateVal) {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// @desc    Create a new classroom
// @route   POST /api/teacher/classrooms
// @access  Private/Teacher/Admin
export const createClassroom = async (req, res) => {
  try {
    const { name, subject = 'Science', classLevel, school = '' } = req.body;
    if (!name || !classLevel) {
      return res.status(400).json({ message: 'Classroom name and class level (grade) are required' });
    }

    const teacherId = req.user._id;
    const code = await generateUniqueCode();

    const classroom = await Classroom.create({
      name: name.trim(),
      code,
      subject: subject.trim(),
      classLevel: String(classLevel).trim(),
      school: school ? school.trim() : (req.user.school || ''),
      teacherId,
      students: [],
    });

    // Update user role to 'teacher' if currently 'user'
    if (req.user.role === 'user') {
      await User.findByIdAndUpdate(teacherId, { role: 'teacher' });
    }

    return res.status(201).json({
      success: true,
      classroom,
    });
  } catch (error) {
    console.error('🔥 Error creating classroom:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Get all classrooms created by the teacher
// @route   GET /api/teacher/classrooms
// @access  Private/Teacher/Admin
export const getTeacherClassrooms = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const classrooms = await Classroom.find({ teacherId, isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    // Attach student count and active assignments count to each classroom
    const classroomIds = classrooms.map(c => c._id);
    const activeAssignments = await Assignment.find({
      classroomId: { $in: classroomIds },
      status: 'active',
    }).select('classroomId').lean();

    const assignmentCountMap = {};
    activeAssignments.forEach(a => {
      const cid = a.classroomId.toString();
      assignmentCountMap[cid] = (assignmentCountMap[cid] || 0) + 1;
    });

    const enriched = classrooms.map(c => ({
      ...c,
      studentCount: Array.isArray(c.students) ? c.students.length : 0,
      activeAssignmentsCount: assignmentCountMap[c._id.toString()] || 0,
    }));

    return res.json({
      success: true,
      classrooms: enriched,
    });
  } catch (error) {
    console.error('🔥 Error fetching teacher classrooms:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Get single classroom details with populated student roster and assignments
// @route   GET /api/teacher/classrooms/:id
// @access  Private/Teacher/Admin
export const getClassroomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const classroom = await Classroom.findOne({ _id: id, isActive: true })
      .populate('students', 'username name phone email classLevel totalPoints createdAt lastActiveAt platform chaptersProgress')
      .populate('teacherId', 'username name phone email school')
      .lean();

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Ensure authorized (owner or admin)
    const isOwner = classroom.teacherId?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this classroom' });
    }

    // Fetch assignments for this classroom
    const assignments = await Assignment.find({ classroomId: id })
      .sort({ createdAt: -1 })
      .lean();

    // Compute accuracy for each student in the classroom
    const studentsWithAccuracy = (classroom.students || []).map(student => {
      let totalAttempts = 0;
      let correctAttempts = 0;

      if (student.chaptersProgress && Array.isArray(student.chaptersProgress)) {
        student.chaptersProgress.forEach(ch => {
          if (ch.stats) {
            const statsEntries = ch.stats instanceof Map
              ? Array.from(ch.stats.values())
              : Object.values(ch.stats);

            statsEntries.forEach(s => {
              if (s) {
                totalAttempts += (s.correct || 0) + (s.wrong || 0);
                correctAttempts += (s.correct || 0);
              }
            });
          }
        });
      }

      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
      const { chaptersProgress, ...studentData } = student;
      return {
        ...studentData,
        accuracy,
        totalAttempts,
        correctAttempts,
      };
    });

    return res.json({
      success: true,
      classroom: {
        ...classroom,
        students: studentsWithAccuracy,
        studentCount: studentsWithAccuracy.length,
      },
      assignments,
    });
  } catch (error) {
    console.error('🔥 Error fetching classroom details:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Add student manually by phone, username, or email
// @route   POST /api/teacher/classrooms/:id/students
// @access  Private/Teacher/Admin
export const addStudentToClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ message: 'Phone number, username, or email is required' });
    }

    const classroom = await Classroom.findOne({ _id: id, isActive: true });
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (classroom.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this classroom' });
    }

    const cleanInput = identifier.trim();
    const cleanPhone = cleanInput.replace(/\D/g, '');

    // Search for user
    const query = {
      $or: [
        { username: new RegExp(`^${cleanInput}$`, 'i') },
        { email: new RegExp(`^${cleanInput}$`, 'i') },
      ],
    };
    if (cleanPhone.length >= 10) {
      query.$or.push({ phone: new RegExp(`${cleanPhone.slice(-10)}$`) });
    }

    const student = await User.findOne(query).select('_id username name phone email classLevel totalPoints createdAt lastActiveAt');
    if (!student) {
      return res.status(404).json({ message: `No student found matching "${cleanInput}"` });
    }

    // Check if already in classroom
    if (classroom.students.some(s => s.toString() === student._id.toString())) {
      return res.status(400).json({ message: `${student.name || student.username} is already in this classroom` });
    }

    // Add student to classroom and classroom to student
    classroom.students.push(student._id);
    await classroom.save();

    await User.findByIdAndUpdate(student._id, {
      $addToSet: { enrolledClassrooms: classroom._id },
    });

    // Send push notification to student (fire and forget)
    sendClassroomEnrolledNotification({
      studentId: student._id,
      classroom,
      teacherName: req.user.name || req.user.username || 'Your Teacher',
    }).catch(e => console.error('Enrolled push failed:', e.message));

    return res.json({
      success: true,
      message: `Added ${student.name || student.username} to classroom`,
      student,
    });
  } catch (error) {
    console.error('🔥 Error adding student to classroom:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Remove student from classroom
// @route   DELETE /api/teacher/classrooms/:id/students/:studentId
// @access  Private/Teacher/Admin
export const removeStudentFromClassroom = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const classroom = await Classroom.findOne({ _id: id, isActive: true });
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (classroom.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this classroom' });
    }

    classroom.students = classroom.students.filter(s => s.toString() !== studentId);
    await classroom.save();

    await User.findByIdAndUpdate(studentId, {
      $pull: { enrolledClassrooms: classroom._id },
    });

    return res.json({
      success: true,
      message: 'Student removed from classroom',
    });
  } catch (error) {
    console.error('🔥 Error removing student from classroom:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Delete / Archive a classroom
// @route   DELETE /api/teacher/classrooms/:id
// @access  Private/Teacher/Admin
export const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const classroom = await Classroom.findOne({ _id: id });
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (classroom.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this classroom' });
    }

    classroom.isActive = false;
    await classroom.save();

    // Close all assignments for this deleted classroom
    await Assignment.updateMany({ classroomId: classroom._id }, { status: 'closed' });

    // Pull classroom from enrolled students
    await User.updateMany(
      { enrolledClassrooms: classroom._id },
      { $pull: { enrolledClassrooms: classroom._id } }
    );

    return res.json({
      success: true,
      message: 'Classroom archived successfully',
    });
  } catch (error) {
    console.error('🔥 Error deleting classroom:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Create homework assignment for a classroom
// @route   POST /api/teacher/classrooms/:id/assignments
// @access  Private/Teacher/Admin
export const createAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      instructions = '',
      chapterId = null,
      chapterTitle,
      targetLessons,
      isEntireChapter = false,
      dueDate,
    } = req.body;

    if (!title || !chapterTitle || !targetLessons || !dueDate) {
      return res.status(400).json({
        message: 'Title, chapterTitle, targetLessons, and dueDate are required.',
      });
    }

    if (!Array.isArray(targetLessons) || targetLessons.length === 0) {
      return res.status(400).json({
        message: 'At least one target lesson must be selected.',
      });
    }

    const classroom = await Classroom.findOne({ _id: id, isActive: true });
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (classroom.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to assign homework to this classroom' });
    }

    const assignment = await Assignment.create({
      classroomId: classroom._id,
      teacherId: req.user._id,
      title: title.trim(),
      instructions: instructions ? instructions.trim() : '',
      chapterId: chapterId || null,
      chapterTitle: chapterTitle.trim(),
      targetLessons: targetLessons.map(tl => ({
        moduleId: tl.moduleId,
        title: tl.title,
        order: Number(tl.order || 1),
      })),
      isEntireChapter: !!isEntireChapter,
      dueDate: new Date(dueDate),
      status: 'active',
      remindersSent: {
        dueTomorrow: false,
        dueToday: false,
        overdue: false,
      },
    });

    // Send push notification to all classroom students (fire and forget)
    sendHomeworkAssignedNotification({
      assignment,
      classroom,
      teacherName: req.user.name || req.user.username || 'Your Teacher',
    }).catch(e => console.error('Homework assigned push failed:', e.message));

    return res.status(201).json({
      success: true,
      message: 'Homework assigned successfully',
      assignment,
    });
  } catch (error) {
    console.error('🔥 Error creating assignment:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Get detailed real-time tracking of an assignment with Completed vs Pending lists & WhatsApp text
// @route   GET /api/teacher/assignments/:assignmentId/tracking
// @access  Private/Teacher/Admin
export const getAssignmentTracking = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const classroom = await Classroom.findById(assignment.classroomId)
      .populate('students', 'username name phone email classLevel totalPoints createdAt lastActiveAt chaptersProgress')
      .lean();

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (classroom.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view tracking for this assignment' });
    }

    const targetModuleIds = assignment.targetLessons.map(l => l.moduleId.toString());
    const totalTargets = targetModuleIds.length;

    const completedStudents = [];
    const pendingStudents = [];

    const students = classroom.students || [];

    students.forEach(student => {
      // Collect set of completed module IDs from student's chaptersProgress
      const completedSet = new Set();
      let lastCompletedTimestamp = null;

      if (Array.isArray(student.chaptersProgress)) {
        student.chaptersProgress.forEach(cp => {
          if (Array.isArray(cp.completedModules)) {
            cp.completedModules.forEach(mid => completedSet.add(String(mid)));
          }
          if (cp.updatedAt) {
            const dt = new Date(cp.updatedAt);
            if (!lastCompletedTimestamp || dt > lastCompletedTimestamp) {
              lastCompletedTimestamp = dt;
            }
          }
        });
      }

      // Check which of the assignment's target lessons the student has completed
      const completedTargetIds = targetModuleIds.filter(mid => completedSet.has(mid));
      const completedCount = completedTargetIds.length;
      const isCompleted = totalTargets > 0 && completedCount === totalTargets;
      const progressPercent = totalTargets > 0 ? Math.round((completedCount / totalTargets) * 100) : 0;

      const record = {
        _id: student._id,
        username: student.username,
        name: student.name || student.username,
        phone: student.phone || '',
        email: student.email || '',
        totalPoints: student.totalPoints || 0,
        completedCount,
        totalTargets,
        progressPercent,
        isCompleted,
        lastActiveAt: student.lastActiveAt,
        completedAt: isCompleted ? lastCompletedTimestamp : null,
      };

      if (isCompleted) {
        completedStudents.push(record);
      } else {
        pendingStudents.push(record);
      }
    });

    // Sort completed students by completion time or points
    completedStudents.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    // Sort pending students with most progress first
    pendingStudents.sort((a, b) => b.completedCount - a.completedCount);

    const totalStudents = students.length;
    const completedCount = completedStudents.length;
    const pendingCount = pendingStudents.length;
    const completionRate = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

    const dueDateFormatted = toISTDateString(assignment.dueDate);

    // Build the clean, emoji-formatted WhatsApp Report
    const completedListText = completedStudents.length > 0
      ? completedStudents.map((s, idx) => `${idx + 1}. ${s.name || s.username}`).join('\n')
      : 'None yet';

    const pendingListText = pendingStudents.length > 0
      ? pendingStudents.map((s, idx) => `${idx + 1}. ${s.name || s.username} (${s.completedCount}/${totalTargets} lessons completed)`).join('\n')
      : 'None! Everyone finished 🎉';

    const whatsappReportText = `📚 *Hoshiyaar Classroom Report*
🏫 *Class:* ${classroom.name} (${classroom.subject})
📝 *Homework:* ${assignment.title}
📖 *Chapter:* ${assignment.chapterTitle} (${totalTargets} ${totalTargets === 1 ? 'lesson' : 'lessons'})
⏰ *Deadline:* ${dueDateFormatted}

📊 *Summary:* ${completedCount}/${totalStudents} Students Completed (${completionRate}%)

✅ *Completed (${completedCount}):*
${completedListText}

⏳ *Pending (${pendingCount}):*
${pendingListText}

_Generated by Hoshiyaar Teacher Mode_`;

    return res.json({
      success: true,
      assignment,
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        code: classroom.code,
        subject: classroom.subject,
        classLevel: classroom.classLevel,
        school: classroom.school,
      },
      summary: {
        totalStudents,
        completedCount,
        pendingCount,
        completionRate,
        isOverdue: new Date() > new Date(assignment.dueDate),
      },
      completedStudents,
      pendingStudents,
      whatsappReportText,
    });
  } catch (error) {
    console.error('🔥 Error fetching assignment tracking:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Toggle assignment status (active / closed)
// @route   PATCH /api/teacher/assignments/:assignmentId/status
// @access  Private/Teacher/Admin
export const toggleAssignmentStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;
    if (!['active', 'closed', 'draft'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    assignment.status = status;
    await assignment.save();

    return res.json({
      success: true,
      message: `Assignment marked as ${status}`,
      assignment,
    });
  } catch (error) {
    console.error('🔥 Error toggling assignment status:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Get available classes and subjects directly from database
// @route   GET /api/teacher/curriculum-options
// @access  Private
export const getCurriculumOptions = async (req, res) => {
  try {
    const classLevels = await ClassLevel.find({}).sort({ order: 1, name: 1 }).lean();
    const classMap = new Map();
    classLevels.forEach(cl => {
      const name = String(cl.name).trim();
      if (name && !classMap.has(name)) {
        classMap.set(name, {
          value: name,
          label: `Class ${name}`,
          order: cl.order || parseInt(name, 10) || 99,
        });
      }
    });

    const classes = Array.from(classMap.values()).sort((a, b) => a.order - b.order);

    const subjectsRaw = await Subject.find({}).populate('classId').lean();
    const classSubjectMap = {};
    const allSubjectNames = new Set();

    subjectsRaw.forEach(s => {
      const subjectName = String(s.name).trim();
      if (!subjectName) return;
      allSubjectNames.add(subjectName);

      const className = s.classId?.name ? String(s.classId.name).trim() : null;
      if (className) {
        if (!classSubjectMap[className]) {
          classSubjectMap[className] = new Set();
        }
        classSubjectMap[className].add(subjectName);
      }
    });

    const formattedClassSubjectMap = {};
    classes.forEach(c => {
      const set = classSubjectMap[c.value];
      formattedClassSubjectMap[c.value] = set && set.size > 0
        ? Array.from(set).sort()
        : (allSubjectNames.size > 0 ? Array.from(allSubjectNames).sort() : ['Science']);
    });

    const subjects = allSubjectNames.size > 0
      ? Array.from(allSubjectNames).sort()
      : ['Science'];

    return res.json({
      success: true,
      classes: classes.length > 0 ? classes : [
        { value: '6', label: 'Class 6', order: 6 },
        { value: '7', label: 'Class 7', order: 7 },
        { value: '8', label: 'Class 8', order: 8 },
      ],
      subjects,
      classSubjectMap: formattedClassSubjectMap,
    });
  } catch (error) {
    console.error('🔥 Error fetching teacher curriculum options:', error);
    return res.status(500).json({ message: 'Failed to load options from database' });
  }
};

// @desc    Get registered students from the classroom's school who are not yet enrolled
// @route   GET /api/teacher/classrooms/:id/school-students
// @access  Private
export const getSchoolStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const classroom = await Classroom.findById(id).lean();
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    if (!classroom.school || !classroom.school.trim()) {
      return res.json({
        success: true,
        school: '',
        students: [],
        message: 'No school specified for this classroom',
      });
    }

    const schoolQuery = classroom.school.trim();
    const escapedSchool = schoolQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find students matching the school, excluding students already enrolled
    const enrolledIds = (classroom.students || []).map(s => s.toString());
    const query = {
      school: { $regex: new RegExp(escapedSchool, 'i') },
      _id: { $nin: enrolledIds },
    };

    const students = await User.find(query)
      .select('_id name username phone email classLevel totalPoints createdAt')
      .sort({ classLevel: 1, name: 1 })
      .lean();

    return res.json({
      success: true,
      school: classroom.school,
      students,
    });
  } catch (error) {
    console.error('🔥 Error fetching school students:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Bulk add students from school to classroom
// @route   POST /api/teacher/classrooms/:id/bulk-add-students
// @access  Private
export const bulkAddStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required' });
    }

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const existingStudentSet = new Set((classroom.students || []).map(s => s.toString()));
    const newStudentIds = [];

    studentIds.forEach(sid => {
      const s = String(sid);
      if (!existingStudentSet.has(s)) {
        existingStudentSet.add(s);
        newStudentIds.push(sid);
      }
    });

    if (newStudentIds.length === 0) {
      return res.json({
        success: true,
        message: 'Selected students are already enrolled in this classroom',
        addedCount: 0,
      });
    }

    classroom.students.push(...newStudentIds);
    await classroom.save();

    await User.updateMany(
      { _id: { $in: newStudentIds } },
      { $addToSet: { enrolledClassrooms: classroom._id } }
    );

    // Send bulk push notifications to newly added students (fire and forget)
    sendClassroomBulkEnrolledNotifications({
      studentIds: newStudentIds,
      classroom,
      teacherName: req.user.name || req.user.username || 'Your Teacher',
    }).catch(e => console.error('Bulk enrolled push failed:', e.message));

    return res.json({
      success: true,
      message: `Successfully added ${newStudentIds.length} students to classroom`,
      addedCount: newStudentIds.length,
    });
  } catch (error) {
    console.error('🔥 Error bulk adding students to classroom:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// @desc    Nudge all pending students for an assignment via Firebase Push Notification
// @route   POST /api/teacher/assignments/:assignmentId/nudge-pending
// @access  Private/Teacher/Admin
export const nudgePendingStudents = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to nudge students for this assignment' });
    }

    const result = await sendManualNudgeToPendingStudents({
      assignmentId,
      teacherUser: req.user,
    });

    return res.json({
      success: true,
      message: result.nudgedCount > 0
        ? `Push reminder sent to ${result.nudgedCount} pending student${result.nudgedCount === 1 ? '' : 's'}!`
        : (result.pendingCount === 0
            ? 'All students have already completed this homework!'
            : 'Pending students do not have active push notification devices registered.'),
      ...result,
    });
  } catch (error) {
    console.error('🔥 Error nudging pending students:', error);
    return res.status(500).json({ message: error.message || 'Failed to send push reminder' });
  }
};


