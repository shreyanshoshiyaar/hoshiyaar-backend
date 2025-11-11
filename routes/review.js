import express from 'express';
import UserIncorrectQuestion from '../models/UserIncorrectQuestion.js';
import mongoose from 'mongoose';
import DefaultRevisionQuestion from '../models/DefaultRevisionQuestion.js';
import Module from '../models/Module.js';

const router = express.Router();

// POST /api/review/incorrect - save one incorrect question
router.post('/incorrect', async (req, res) => {
	try {
		const { userId, questionId, moduleId, chapterId } = req.body;
		if (!userId || !questionId) {
			return res.status(400).json({ message: 'userId and questionId are required' });
		}
    const now = new Date();
    console.log('[review] save incorrect', { userId, questionId, moduleId, chapterId });
    const filter = { userId: new mongoose.Types.ObjectId(String(userId)), questionId: String(questionId) };
    // Use $set only for moduleId/chapterId to avoid path conflict
    const update = { $setOnInsert: { firstSeenAt: now }, $set: { lastSeenAt: now }, $inc: { count: 1 } };
    if (moduleId) { update.$set.moduleId = String(moduleId); }
    if (chapterId) { update.$set.chapterId = String(chapterId); }
    const updated = await UserIncorrectQuestion.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    return res.status(201).json(updated);
	} catch (err) {
    console.error('Error saving incorrect question', err?.message || err);
    return res.status(500).json({ message: 'Internal server error', error: String(err?.message || err) });
	}
});

// GET /api/review/incorrect?userId=... - list incorrect questionIds for user
router.get('/incorrect', async (req, res) => {
	try {
		const { userId, moduleId, chapterId } = req.query;
		if (!userId) return res.status(400).json({ message: 'userId is required' });
		const query = { userId };
		if (moduleId) query.moduleId = moduleId;
		if (chapterId) query.chapterId = chapterId;
		const rows = await UserIncorrectQuestion.find(query).sort({ lastSeenAt: -1 }).limit(200);
		return res.json(rows.map(r => ({ questionId: r.questionId, moduleId: r.moduleId, chapterId: r.chapterId, count: r.count, lastSeenAt: r.lastSeenAt })));
	} catch (err) {
		console.error('Error listing incorrect questions', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// POST /api/review/backfill - one-time helper to backfill moduleId (and optionally chapterId)
// WARNING: keep this non-public in production; add auth as needed
router.post('/backfill', async (req, res) => {
  try {
    const { limit = 1000 } = req.body || {};
    const missing = await UserIncorrectQuestion.find({ $or: [ { moduleId: { $exists: false } }, { moduleId: '' } ] }).limit(Number(limit));
    let updated = 0;
    for (const row of missing) {
      if (!row.questionId) continue;
      const [mod] = String(row.questionId).split('_');
      if (!mod) continue;
      row.moduleId = mod;
      await row.save();
      updated += 1;
    }
    return res.json({ updated, scanned: missing.length });
  } catch (err) {
    console.error('Error backfilling incorrect questions', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/review/defaults?chapterId=&unitId=&moduleId=&subjectId=&board=&classTitle=&userId=
router.get('/defaults', async (req, res) => {
  try {
    const { moduleId, unitId, chapterId, subjectId } = req.query;
    const filter = { active: true };
    if (moduleId) filter.moduleId = moduleId;
    else if (unitId) filter.unitId = unitId;
    else if (chapterId) filter.chapterId = chapterId;
    else if (subjectId) filter.subjectId = subjectId;
    const rows = await DefaultRevisionQuestion.find(filter).sort({ order: 1, createdAt: 1 }).limit(500);
    return res.json(rows);
  } catch (err) {
    console.error('Error listing default revision questions', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/review/defaults/import - import defaults with the same format as lessons
router.post('/defaults/import', async (req, res) => {
  try {
    const payload = req.body;
    // Expect same shape as lesson import; map into DefaultRevisionQuestion under chosen scope
    const { board_title = 'CBSE', class_title = '5', subject_title = 'Science', chapterId, unitId, moduleId } = payload || {};
    // Resolve references if provided as titles would require joins; for MVP, accept chapterId/unitId/moduleId directly
    if (!chapterId && !unitId && !moduleId) {
      return res.status(400).json({ message: 'chapterId or unitId or moduleId required' });
    }
    // If importing at unit or chapter scope and moduleId not provided,
    // distribute lessons to modules in order for better per-lesson mapping
    let modulesArr = [];
    if (!moduleId && (unitId || chapterId)) {
      const filter = unitId ? { unitId } : { chapterId };
      modulesArr = await Module.find(filter).sort({ order: 1 });
    }

    const questions = [];
    let order = 0;
    let lessonIndex = 0;
    for (const lesson of (payload?.lessons || [])) {
      const targetModuleId = moduleId || (modulesArr?.[lessonIndex]?._id);
      for (const c of (lesson?.concepts || [])) {
        order += 1;
        questions.push({
          chapterId,
          unitId,
          moduleId: targetModuleId || undefined,
          lessonIndex: typeof c.lessonIndex === 'number' ? c.lessonIndex : undefined,
          type: c.type === 'concept' ? 'statement' : c.type,
          question: c.question,
          text: c.text,
          options: Array.isArray(c.options) ? c.options.filter(Boolean) : [],
          answer: c.answer,
          words: Array.isArray(c.words) ? c.words.filter(Boolean) : [],
          images: Array.isArray(c.images) ? c.images.filter(Boolean) : [],
          order
        });
      }
      lessonIndex += 1;
    }
    const inserted = await DefaultRevisionQuestion.insertMany(questions);
    return res.status(201).json({ inserted: inserted.length });
  } catch (err) {
    console.error('Error importing default revision questions', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

