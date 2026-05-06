import User from '../models/User.js';

// Helper to compute award delta based on rules and ledger
function computeDelta({ existing, type, result }) {
  const isCurriculum = type === 'curriculum';
  const isRevision = type === 'revision';

  if (isCurriculum) {
    // Count only first attempt: if already attempted, no further change
    if (existing) {
      return 0;
    }
    return result === 'correct' ? 3 : -3;
  }

  if (isRevision) {
    // Default revision: +5 on first correct; 0 on incorrect
    if (!existing) {
      return result === 'correct' ? 5 : 0;
    }
    // If previously incorrect (awarded 0) and now correct, allow +5 once
    if (!existing.correct && result === 'correct' && (existing.awarded || 0) === 0) {
      return 5;
    }
    return 0;
  }

  return 0;
}

export const awardPoints = async (req, res) => {
  try {
    const { userId, questionId, moduleId = null, type = 'curriculum', result } = req.body || {};
    if (!userId || !questionId || !result) {
      return res.status(400).json({ message: 'userId, questionId and result are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ledger = user.pointsLedger || new Map();
    const existing = ledger.get(questionId);

    // Rule: You can't get more points if lesson is once completed
    if (moduleId) {
      const isCompleted = user.chaptersProgress?.some(cp => 
        Array.isArray(cp.completedModules) && cp.completedModules.includes(String(moduleId))
      );
      if (isCompleted) {
        return res.json({
          totalPoints: user.totalPoints || 0,
          delta: 0,
          message: 'Module already completed'
        });
      }
    }

    const delta = computeDelta({ existing, type, result });
    if (delta !== 0) {
      const nextAwarded = (existing?.awarded || 0) + delta;
      const nextEntry = {
        awarded: nextAwarded,
        correct: result === 'correct' ? true : existing?.correct || false,
        type,
        moduleId: moduleId ? String(moduleId) : (existing?.moduleId || null),
        attemptedAt: new Date(),
      };
      ledger.set(questionId, nextEntry);
      user.pointsLedger = ledger;
      user.totalPoints = Math.max(0, (user.totalPoints || 0) + delta);
    } else if (!existing) {
      // Record first seen attempt even if delta is zero
      ledger.set(questionId, {
        awarded: 0,
        correct: result === 'correct',
        type,
        moduleId: moduleId ? String(moduleId) : null,
        attemptedAt: new Date(),
      });
      user.pointsLedger = ledger;
    }

    await user.save();

    return res.json({
      totalPoints: user.totalPoints || 0,
      delta,
    });
  } catch (err) {
    console.error('[points] award error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSummary = async (req, res) => {
  try {
    const { userId, days = 30, chapter = null } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const user = await User.findById(userId).select('totalPoints pointsLedger chaptersProgress');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const totalPoints = Number(user.totalPoints || 0);

    // Build aggregations from pointsLedger when present
    const ledger = user.pointsLedger instanceof Map
      ? Array.from(user.pointsLedger.entries())
      : Object.entries(user.pointsLedger || {});

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - Number(days));

    // timeSeries by day
    const ts = new Map(); // YYYY-MM-DD -> points
    // byModule aggregation
    const byModule = new Map(); // moduleId -> points
    // byChapter aggregation (fallback via chaptersProgress; otherwise derive from moduleId if possible)
    const byChapter = new Map(); // chapterNumber -> points

    for (const [, entry] of ledger) {
      try {
        const at = entry?.attemptedAt ? new Date(entry.attemptedAt) : null;
        const awarded = Number(entry?.awarded || 0);
        if (!Number.isFinite(awarded) || awarded === 0) continue;
        if (at && at < start) continue; // outside window for timeSeries
        const ymd = at ? at.toISOString().slice(0,10) : now.toISOString().slice(0,10);
        ts.set(ymd, (ts.get(ymd) || 0) + awarded);
        if (entry?.moduleId) byModule.set(String(entry.moduleId), (byModule.get(String(entry.moduleId)) || 0) + awarded);
      } catch (_) {}
    }

    // Compute byChapter from chaptersProgress bestScore as a reliable summary
    const cp = Array.isArray(user.chaptersProgress) ? user.chaptersProgress : [];
    for (const progress of cp) {
      let sum = 0;
      const stats = progress?.stats || new Map();
      let values;
      if (stats instanceof Map) values = Array.from(stats.values());
      else if (stats && typeof stats.forEach === 'function') { const tmp=[]; stats.forEach(v=>tmp.push(v)); values=tmp; }
      else values = Object.values(stats || {});
      for (const val of values) {
        const best = Number(val?.bestScore || 0);
        if (Number.isFinite(best)) sum += best;
      }
      const chapNum = Number(progress?.chapter || 0);
      if (chapNum > 0) byChapter.set(chapNum, (byChapter.get(chapNum) || 0) + sum);
    }

    const timeSeries = Array.from(ts.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date, points])=>({ date, points }));
    const chapters = Array.from(byChapter.entries()).sort((a,b)=>a[0]-b[0]).map(([chapterNumber, points])=>({ chapterNumber, points }));
    const modules = Array.from(byModule.entries()).map(([moduleId, points])=>({ moduleId, points }));

    // Optional filter by chapter is not applied server-side for modules; frontend can filter using module->chapter mapping if needed

    return res.json({ totalPoints, timeSeries, byChapter: chapters, byModule: modules });
  } catch (err) {
    console.error('[points] summary error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin-only: backfill totalPoints from existing chaptersProgress stats
export const backfillTotals = async (req, res) => {
  try {
    const { secret = '', limit = 1000, dryRun = false } = req.body || {};
    if (!process.env.ADMIN_BACKFILL_SECRET || secret !== process.env.ADMIN_BACKFILL_SECRET) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const cursor = User.find({}).select('totalPoints chaptersProgress').cursor();
    let scanned = 0;
    let updated = 0;
    for await (const user of cursor) {
      if (scanned >= Number(limit)) break;
      scanned += 1;
      let sum = 0;
      const progressArr = Array.isArray(user.chaptersProgress) ? user.chaptersProgress : [];
      for (const entry of progressArr) {
        const stats = entry?.stats || new Map();
        let iterable;
        if (stats instanceof Map) iterable = Array.from(stats.values());
        else if (stats && typeof stats.forEach === 'function') {
          const tmp = [];
          stats.forEach((v) => tmp.push(v));
          iterable = tmp;
        } else iterable = Object.values(stats || {});
        for (const val of iterable) {
          const best = Number(val?.bestScore || 0);
          if (Number.isFinite(best)) sum += best;
        }
      }
      const current = Number(user.totalPoints || 0);
      if (sum > 0 && sum !== current) {
        if (!dryRun) {
          user.totalPoints = sum;
          await user.save();
        }
        updated += 1;
      }
    }
    return res.json({ scanned, updated, dryRun: !!dryRun });
  } catch (err) {
    console.error('[points] backfill error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get leaderboard for a specific school and timeframe
export const getLeaderboard = async (req, res) => {
  try {
    const { school, timeframe = 'total' } = req.query;
    if (!school) return res.status(400).json({ message: 'school is required' });

    // Fetch all users from that school
    const users = await User.find({ school }).select('username name school totalPoints pointsLedger');
    
    const now = new Date();
    const start = new Date(now);
    if (timeframe === 'weekly') {
      start.setDate(start.getDate() - 7);
    }

    const leaderboard = users.map(user => {
      let points = 0;
      if (timeframe === 'weekly') {
        // Aggregate points from ledger for the last 7 days
        const ledger = user.pointsLedger instanceof Map 
          ? Array.from(user.pointsLedger.values()) 
          : Object.values(user.pointsLedger || {});
        
        points = ledger.reduce((acc, entry) => {
          const at = entry.attemptedAt ? new Date(entry.attemptedAt) : null;
          if (at && at >= start) {
            return acc + (Number(entry.awarded) || 0);
          }
          return acc;
        }, 0);
      } else {
        points = Number(user.totalPoints || 0);
      }

      return {
        username: user.username,
        name: user.name || user.username,
        school: user.school,
        totalPoints: Math.max(0, points)
      };
    });

    // Sort by points descending
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    return res.json({
      school,
      timeframe,
      leaderboard: leaderboard.slice(0, 50) // Top 50
    });
  } catch (err) {
    console.error('[points] leaderboard error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get unique school names for autocomplete
export const getSchools = async (req, res) => {
  try {
    const { q = '' } = req.query;
    
    // Find unique schools
    // We can use distinct, but if we want to filter by query 'q', we might need a regex
    let query = { school: { $ne: null, $exists: true } };
    if (q) {
      query.school = { $regex: q, $options: 'i' };
    }

    const schools = await User.distinct('school', query);
    
    return res.json(schools.filter(Boolean));
  } catch (err) {
    console.error('[points] schools error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};// Revert points earned in a session (e.g. user quit lesson mid-way)
export const revertSessionPoints = async (req, res) => {
  try {
    const { userId, questionIds } = req.body || {};
    if (!userId || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: 'userId and questionIds array are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ledger = user.pointsLedger || new Map();
    let totalDeduction = 0;

    for (const qid of questionIds) {
      const entry = ledger.get(qid);
      if (entry) {
        totalDeduction += (entry.awarded || 0);
        ledger.delete(qid);
      }
    }

    if (totalDeduction !== 0) {
      user.totalPoints = Math.max(0, (user.totalPoints || 0) - totalDeduction);
      user.pointsLedger = ledger;
      await user.save();
    }

    return res.json({
      totalPoints: user.totalPoints || 0,
      deducted: totalDeduction,
    });
  } catch (err) {
    console.error('[points] revert error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
