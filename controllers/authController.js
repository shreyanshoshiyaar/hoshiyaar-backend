import User from '../models/User.js';
import Board from '../models/Board.js';
import ClassLevel from '../models/ClassLevel.js';
import Subject from '../models/Subject.js';
import Chapter from '../models/Chapter.js';
import Module from '../models/Module.js';
import jwt from 'jsonwebtoken';

// Helper function to generate a JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { username, name, email = null, age, dateOfBirth, classLevel = null, board = null, classTitle = null, subject = null, chapter = null } = req.body;

  try {
    // Ensure unique username
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Resolve IDs if names provided
    let boardDoc = null, classDoc = null, subjectDoc = null, chapterDoc = null;
    if (board) boardDoc = await Board.findOne({ name: board });
    // Prefer classLevel if provided; fall back to classTitle for backward compat. Scope by board when known
    const className = classLevel ?? classTitle;
    if (className) {
      classDoc = await ClassLevel.findOne({ name: String(className), ...(boardDoc ? { boardId: boardDoc._id } : {}) });
    }
    // Resolve subject with graceful fallbacks: (board+class) -> (board only) -> (by name)
    if (subject) {
      if (boardDoc && classDoc) {
        subjectDoc = await Subject.findOne({ boardId: boardDoc._id, classId: classDoc._id, name: subject });
      }
      if (!subjectDoc && boardDoc) {
        subjectDoc = await Subject.findOne({ boardId: boardDoc._id, name: subject });
      }
      if (!subjectDoc) {
        subjectDoc = await Subject.findOne({ name: subject });
      }
    }
    // Resolve chapter similarly: prefer via subjectId, otherwise by title only
    if (chapter) {
      if (subjectDoc) {
        chapterDoc = await Chapter.findOne({ subjectId: subjectDoc._id, title: chapter });
      }
      if (!chapterDoc) {
        chapterDoc = await Chapter.findOne({ title: chapter });
      }
    }

    // Back-fill missing associations from what we discovered
    if (!classDoc && subjectDoc?.classId) {
      classDoc = await ClassLevel.findById(subjectDoc.classId);
    }
    if (!boardDoc && (subjectDoc?.boardId || classDoc?.boardId)) {
      const bid = subjectDoc?.boardId || classDoc?.boardId;
      if (bid) boardDoc = await Board.findById(bid);
    }
    if (!subjectDoc && chapterDoc?.subjectId) {
      subjectDoc = await Subject.findById(chapterDoc.subjectId);
    }

    const user = await User.create({
      username,
      name,
      email,
      age,
      dateOfBirth,
      classLevel,
      board,
      subject,
      chapter,
      boardId: boardDoc ? boardDoc._id : null,
      classId: classDoc ? classDoc._id : null,
      subjectId: subjectDoc ? subjectDoc._id : null,
      chapterId: chapterDoc ? chapterDoc._id : null,
      // Show onboarding after signup until the learner completes selections
      // Mark onboarding complete only if board, subject, and chapter are present
      onboardingCompleted: !!((board || boardDoc) && (subject || subjectDoc) && (chapter || chapterDoc)),
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        classLevel: user.classLevel,
        board: user.board,
        subject: user.subject,
        chapter: user.chapter,
        onboardingCompleted: user.onboardingCompleted,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Register an anonymous guest user
// @route   POST /api/auth/register-guest
// @access  Public
export const registerGuest = async (req, res) => {
  try {
    const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const user = await User.create({
      username: guestId,
      name: 'Learner',
      isGuest: true,
      onboardingCompleted: false,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        name: user.name,
        isGuest: user.isGuest,
        onboardingCompleted: user.onboardingCompleted,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid guest data' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { username, dateOfBirth } = req.body;

  // Basic validation to ensure inputs exist
  if (!username || !dateOfBirth) {
    return res.status(400).json({ message: 'Please provide a username and date of birth' });
  }

  try {
    // Find user by username
    const user = await User.findOne({ username });

    // Check if user exists and then compare the date of birth
    if (user && (await user.matchDateOfBirth(dateOfBirth))) {
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        classLevel: user.classLevel,
        school: user.school,
        board: user.board,
        subject: user.subject,
        chapter: user.chapter,
        onboardingCompleted: user.onboardingCompleted,
        token: generateToken(user._id),
      });
    } else {
      // Use a generic error message for security
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error); // Log the actual error on the server for debugging
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user data
// @route   GET /api/auth/user/:userId
// @access  Public (for simplicity) - ideally protect with auth middleware
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('username name email phone age dateOfBirth classLevel school board subject chapter onboardingCompleted boardId classId subjectId chapterId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      dateOfBirth: user.dateOfBirth,
      classLevel: user.classLevel,
      school: user.school,
      board: user.board,
      subject: user.subject,
      chapter: user.chapter,
        onboardingCompleted: user.onboardingCompleted,
        boardId: user.boardId,
        classId: user.classId,
        subjectId: user.subjectId,
        chapterId: user.chapterId,
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Update onboarding selections for a user
// @route   PUT /api/auth/onboarding
// @access  Public (for simplicity) - ideally protect with auth middleware
export const updateOnboarding = async (req, res) => {
  const { userId, username = null, board = null, subject = null, chapter = null, name = null, phone = null, classLevel = null, dateOfBirth = null, email = null, classTitle = null, school = null } = req.body;
  
  console.log('🔄 [Backend] updateOnboarding called with:', { userId, subject, board, chapter });
  
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }
  try {
    console.log('🔍 [Backend] Looking for user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ [Backend] User not found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('✅ [Backend] User found:', { id: user._id, username: user.username, currentSubject: user.subject });
    // Username update with uniqueness check
    if (username !== null && String(username).trim()) {
      const normalized = String(username).trim();
      if (normalized !== user.username) {
        const exists = await User.exists({ username: normalized, _id: { $ne: user._id } });
        if (exists) {
          return res.status(400).json({ message: 'Username already taken' });
        }
        user.username = normalized;
      }
    }
    if (board !== null) user.board = board;
    if (subject !== null) {
      console.log('🔄 [Backend] Updating subject from', user.subject, 'to', subject);
      user.subject = subject;
    }
    if (chapter !== null) user.chapter = chapter;
    if (name !== null) user.name = name;
    if (phone !== null) user.phone = phone;
    if (school !== null) user.school = school;
    if (classLevel !== null) user.classLevel = classLevel;
    if (dateOfBirth !== null) {
      const parsed = dateOfBirth ? new Date(dateOfBirth) : null;
      if (parsed && isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid dateOfBirth format. Use YYYY-MM-DD.' });
      }
      user.dateOfBirth = parsed;
    }
    if (email !== null) user.email = email;
    // Resolve and persist normalized IDs based on current string selections
    try {
      let boardDoc = null, classDoc = null, subjectDoc = null, chapterDoc = null;
      if (user.board) boardDoc = await Board.findOne({ name: user.board });
      // Resolve class by classLevel or classTitle and scope by board when available
      const className = user.classLevel || classLevel || classTitle || '';
      if (className) classDoc = await ClassLevel.findOne({ name: String(className), ...(boardDoc ? { boardId: boardDoc._id } : {}) });
      // Resolve subject with graceful fallbacks
      if (user.subject) {
        if (boardDoc && classDoc) {
          subjectDoc = await Subject.findOne({ boardId: boardDoc._id, classId: classDoc._id, name: user.subject });
        }
        if (!subjectDoc && boardDoc) {
          subjectDoc = await Subject.findOne({ boardId: boardDoc._id, name: user.subject });
        }
        if (!subjectDoc) {
          subjectDoc = await Subject.findOne({ name: user.subject });
        }
      }
      // Resolve chapter
      if (user.chapter) {
        if (subjectDoc) {
          chapterDoc = await Chapter.findOne({ subjectId: subjectDoc._id, title: user.chapter });
        }
        if (!chapterDoc) {
          chapterDoc = await Chapter.findOne({ title: user.chapter });
        }
      }
      // Back-fill missing associations from what we discovered
      if (!classDoc && subjectDoc?.classId) {
        classDoc = await ClassLevel.findById(subjectDoc.classId);
      }
      if (!boardDoc && (subjectDoc?.boardId || classDoc?.boardId)) {
        const bid = subjectDoc?.boardId || classDoc?.boardId;
        if (bid) boardDoc = await Board.findById(bid);
      }
      if (!subjectDoc && chapterDoc?.subjectId) {
        subjectDoc = await Subject.findById(chapterDoc.subjectId);
      }
      user.boardId = boardDoc ? boardDoc._id : null;
      user.classId = classDoc ? classDoc._id : null;
      user.subjectId = subjectDoc ? subjectDoc._id : null;
      user.chapterId = chapterDoc ? chapterDoc._id : null;
      // Only flip onboardingCompleted to true if board, subject, and chapter exist
      user.onboardingCompleted = !!((user.board || boardDoc) && (user.subject || subjectDoc) && (user.chapter || chapterDoc));
    } catch (e) {
      // Do not fail the request if resolution fails; keep strings and continue
    }
    console.log('💾 [Backend] Saving user to database...');
    await user.save();
    console.log('✅ [Backend] User saved successfully. New subject:', user.subject);
    
    // Verify the save by fetching the user again
    const verifyUser = await User.findById(userId);
    console.log('🔍 [Backend] Verification - User subject in database:', verifyUser.subject);
    return res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      age: user.age,
      dateOfBirth: user.dateOfBirth,
      classLevel: user.classLevel,
      school: user.school,
      phone: user.phone,
      board: user.board,
      subject: user.subject,
      chapter: user.chapter,
      onboardingCompleted: user.onboardingCompleted,
      boardId: user.boardId,
      classId: user.classId,
      subjectId: user.subjectId,
      chapterId: user.chapterId,
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Get chapter progress for a user
// @route   GET /api/auth/progress/:userId
export const getProgress = async (req, res) => {
  try {
    console.log(`[Auth] getProgress called for userId:`, req.params.userId);
    const user = await User.findById(req.params.userId).select('chaptersProgress');
    if (!user) {
      console.log(`[Auth] User not found:`, req.params.userId);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(`[Auth] Found user with ${user.chaptersProgress?.length || 0} progress entries`);
    res.json(user.chaptersProgress || []);
  } catch (error) {
    console.error(`[Auth] Error in getProgress:`, error);
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Get module-specific progress for a user
// @route   GET /api/auth/module-progress/:userId
export const getModuleProgress = async (req, res) => {
  try {
    const { subject, chapter } = req.query;
    const user = await User.findById(req.params.userId).select('chaptersProgress');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Find progress for specific subject and chapter
    const progress = user.chaptersProgress.find(p => 
      p.subject === subject && p.chapter === parseInt(chapter)
    );
    
    if (!progress) {
      return res.json({ completedModules: [] });
    }
    
    res.json({ 
      completedModules: progress.completedModules || [],
      conceptCompleted: progress.conceptCompleted,
      quizCompleted: progress.quizCompleted
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Update chapter progress
// @route   PUT /api/auth/progress
export const updateProgress = async (req, res) => {
  const { userId, chapter, subject, conceptCompleted, quizCompleted, lessonTitle, isCorrect, deltaScore = 0, resetLesson = false, moduleId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Fallback to user's subject if not provided by client
    const effectiveSubject = (subject ?? user.subject ?? 'Unknown');
    
    // Determine chapter and module ID robustly
    let normalizedChapter;
    let actualModuleId = null;
    try {
      const Module = (await import('../models/Module.js')).default;
      const Chapter = (await import('../models/Chapter.js')).default;
      if (moduleId) {
        const module = await Module.findById(moduleId);
        if (module && module.chapterId) {
          const chapterDoc = await Chapter.findById(module.chapterId);
          if (chapterDoc) normalizedChapter = chapterDoc.order || 1;
          actualModuleId = String(module._id);
        }
      }
      if (!normalizedChapter) {
        // Fallbacks: chapter may be a moduleId string or a numeric chapter index
        if (typeof chapter === 'string' && chapter.length > 10) {
          const module = await Module.findById(chapter);
          if (module && module.chapterId) {
            const chapterDoc = await Chapter.findById(module.chapterId);
            if (chapterDoc) normalizedChapter = chapterDoc.order || 1;
            actualModuleId = String(module._id);
          }
        }
      }
      if (!normalizedChapter) {
        const chapterNum = Number(chapter);
        normalizedChapter = Number.isFinite(chapterNum) && chapterNum > 0 ? chapterNum : 1;
      }
    } catch (e) {
      const chapterNum = Number(chapter);
      normalizedChapter = Number.isFinite(chapterNum) && chapterNum > 0 ? chapterNum : 1;
    }
    // Find progress entry by both chapter and subject
    const idx = user.chaptersProgress.findIndex((c) => c.chapter === normalizedChapter && c.subject === effectiveSubject);
    if (idx >= 0) {
      if (typeof conceptCompleted === 'boolean') user.chaptersProgress[idx].conceptCompleted = conceptCompleted;
      if (typeof quizCompleted === 'boolean') user.chaptersProgress[idx].quizCompleted = quizCompleted;
      
      // Add module-specific completion tracking
      if (actualModuleId && typeof conceptCompleted === 'boolean') {
        if (!Array.isArray(user.chaptersProgress[idx].completedModules)) {
          user.chaptersProgress[idx].completedModules = [];
        }
        const idStr = String(actualModuleId);
        if (conceptCompleted) {
          if (!user.chaptersProgress[idx].completedModules.includes(idStr)) {
            user.chaptersProgress[idx].completedModules.push(idStr);
          }
        } else {
          user.chaptersProgress[idx].completedModules = user.chaptersProgress[idx].completedModules.filter((id) => id !== idStr);
        }
      }
      if (lessonTitle && typeof isCorrect === 'boolean') {
        const stats = user.chaptersProgress[idx].stats || new Map();
        // Reset lesson score if requested when opening lesson
        if (resetLesson) {
          stats.set(lessonTitle, { correct: 0, wrong: 0, bestScore: (stats.get(lessonTitle)?.bestScore || 0), lastScore: 0, lastReviewedAt: new Date() });
        }
        const current = stats.get(lessonTitle) || { correct: 0, wrong: 0, bestScore: 0, lastScore: 0, lastReviewedAt: null };
        if (isCorrect) current.correct += 1; else current.wrong += 1;
        // Update scores: cumulative lastScore for this session; persist bestScore if improved
        const newLast = (current.lastScore || 0) + Number(deltaScore || 0);
        current.lastScore = Math.max(0, newLast);
        current.bestScore = Math.max(current.bestScore || 0, current.lastScore);
        current.lastReviewedAt = new Date();
        stats.set(lessonTitle, current);
        user.chaptersProgress[idx].stats = stats;
        
        console.log(`[Progress] Updated scores for user ${userId}, chapter ${normalizedChapter}, lesson "${lessonTitle}":`, {
          isCorrect,
          deltaScore: Number(deltaScore || 0),
          newLastScore: current.lastScore,
          newBestScore: current.bestScore,
          correct: current.correct,
          wrong: current.wrong
        });
      }
      user.chaptersProgress[idx].updatedAt = new Date();
    } else {
      const newProgress = {
        chapter: normalizedChapter,
        subject: effectiveSubject || 'Unknown', // Include subject in new progress entry
        conceptCompleted: !!conceptCompleted,
        quizCompleted: !!quizCompleted,
        stats: lessonTitle && typeof isCorrect === 'boolean' ? new Map([[lessonTitle, { correct: isCorrect ? 1 : 0, wrong: isCorrect ? 0 : 1, bestScore: Math.max(0, Number(deltaScore || 0)), lastScore: Math.max(0, Number(deltaScore || 0)), lastReviewedAt: new Date() }]]) : new Map(),
      };
      
      // Add module-specific completion tracking for new progress entry
      if (actualModuleId && typeof conceptCompleted === 'boolean') {
        newProgress.completedModules = [];
        if (conceptCompleted) newProgress.completedModules.push(String(actualModuleId));
      }
      
      user.chaptersProgress.push(newProgress);
    }
    await user.save();
    
    // Log the final state to verify database storage
    console.log(`[Progress] Successfully saved progress to database for user ${userId}:`, {
      chapter: normalizedChapter,
      conceptCompleted,
      quizCompleted,
      lessonTitle,
      isCorrect,
      deltaScore: Number(deltaScore || 0),
      totalChapters: user.chaptersProgress.length
    });
    // Invalidate completed modules cache for this user so UI sees fresh IDs
    try {
      const keys = Array.from(completedCache.keys());
      const subjKey = String(effectiveSubject || '*');
      keys.forEach((k) => {
        if (k.startsWith(`${userId}::`)) {
          // Clear both subject-specific and wildcard caches
          if (k === `${userId}::${subjKey}` || k === `${userId}::*`) {
            completedCache.delete(k);
          }
        }
      });
    } catch (_) {}
    
    res.json(user.chaptersProgress);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Check if a username is available
// @route   GET /api/auth/check-username?username=foo
// @access  Public
export const checkUsername = async (req, res) => {
  try {
    const username = (req.query.username || '').trim();
    if (!username) {
      return res.status(400).json({ message: 'username is required', available: false });
    }
    const exists = await User.exists({ username });
    return res.json({ available: !exists });
  } catch (error) {
    return res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// @desc    Verify database storage for debugging
// @route   GET /api/auth/verify-storage/:userId
// @access  Public (for debugging)
export const verifyStorage = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('chaptersProgress');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate total points from all chapters
    let totalPoints = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    
    user.chaptersProgress.forEach((chapter, index) => {
      console.log(`[Verify] Chapter ${chapter.chapter}:`, {
        conceptCompleted: chapter.conceptCompleted,
        quizCompleted: chapter.quizCompleted,
        statsCount: chapter.stats ? chapter.stats.size : 0
      });
      
      if (chapter.stats) {
        chapter.stats.forEach((lessonStats, lessonTitle) => {
          totalPoints += lessonStats.bestScore || 0;
          totalCorrect += lessonStats.correct || 0;
          totalWrong += lessonStats.wrong || 0;
          console.log(`[Verify] Lesson "${lessonTitle}":`, lessonStats);
        });
      }
    });
    
    res.json({
      userId: req.params.userId,
      totalChapters: user.chaptersProgress.length,
      totalPoints,
      totalCorrect,
      totalWrong,
      chaptersProgress: user.chaptersProgress
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

// Simple in-memory cache for completed modules per user/subject
const completedCache = new Map(); // key: `${userId}::${subject||'*'}` -> { at: ms, data: string[] }
const COMPLETED_TTL_MS = 30 * 1000;

// @desc    Get all completed module IDs for a user (optionally by subject)
// @route   GET /api/auth/completed-modules/:userId?subject=Science
// @access  Public (consider protecting with auth in production)
export const getCompletedModules = async (req, res) => {
  try {
    const { userId } = req.params;
    const { subject } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const cacheKey = `${userId}::${subject || '*'}`;
    const cached = completedCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.at < COMPLETED_TTL_MS) {
      return res.json({ completedModuleIds: cached.data, cached: true });
    }

    const user = await User.findById(userId).select('chaptersProgress subject');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const wantedSubject = subject ?? user.subject ?? null;
    const idsSet = new Set();
    (user.chaptersProgress || []).forEach((p) => {
      if (wantedSubject && p.subject !== wantedSubject) return;
      if (Array.isArray(p.completedModules)) {
        p.completedModules.forEach((id) => { if (id) idsSet.add(String(id)); });
      }
    });

    const list = Array.from(idsSet);
    completedCache.set(cacheKey, { at: now, data: list });
    res.json({ completedModuleIds: list, cached: false });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

