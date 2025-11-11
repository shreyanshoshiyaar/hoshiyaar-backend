import Board from '../models/Board.js';
import ClassLevel from '../models/ClassLevel.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import Chapter from '../models/Chapter.js';
import Module from '../models/Module.js';
import CurriculumItem from '../models/CurriculumItem.js';
import Unit from '../models/Unit.js';

// GET /api/curriculum/boards
export const listBoards = async (_req, res) => {
  try {
    const boards = await Board.find({}).sort({ name: 1 });
    return res.json(boards);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/subjects?board=CBSE
export const listSubjects = async (req, res) => {
  try {
    const { board = 'CBSE', classTitle, userId } = req.query;
    if (userId) {
      const u = await User.findById(userId).select('boardId classId');
      if (u && (u.boardId || u.classId)) {
        const subjects = await Subject.find({
          ...(u.boardId ? { boardId: u.boardId } : {}),
          ...(u.classId ? { classId: u.classId } : {}),
        }).sort({ name: 1 });
        return res.json(subjects);
      }
    }
    const b = await Board.findOne({ name: board });
    if (!b) return res.json([]);
    const classFilter = {};
    if (classTitle) {
      const cls = await ClassLevel.findOne({ boardId: b._id, name: String(classTitle) });
      if (!cls) return res.json([]);
      classFilter.classId = cls._id;
    }
    const subjects = await Subject.find({ boardId: b._id, ...classFilter }).sort({ name: 1 });
    return res.json(subjects);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/classes?board=CBSE
export const listClasses = async (req, res) => {
  try {
    const { board = 'CBSE' } = req.query;
    const b = await Board.findOne({ name: board });
    if (!b) return res.json([]);
    const classes = await ClassLevel.find({ boardId: b._id }).sort({ order: 1, name: 1 });
    return res.json(classes);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/curriculum/backfill-subjects
// Creates/ensures Subject for a given board+class and attaches all chapters to it
export const backfillSubjects = async (req, res) => {
  try {
    const { board_title = 'CBSE', class_title = '5', subject_title = 'Science' } = req.body || {};
    const board = await Board.findOneAndUpdate(
      { name: String(board_title) },
      { $setOnInsert: { name: String(board_title) } },
      { upsert: true, new: true }
    );
    const cls = await ClassLevel.findOneAndUpdate(
      { boardId: board._id, name: String(class_title) },
      { $setOnInsert: { boardId: board._id, name: String(class_title), order: Number(class_title) || 1 } },
      { upsert: true, new: true }
    );
    const subject = await Subject.findOneAndUpdate(
      { boardId: board._id, classId: cls._id, name: String(subject_title) },
      { $setOnInsert: { boardId: board._id, classId: cls._id, name: String(subject_title) } },
      { upsert: true, new: true }
    );

    // Attach every chapter to this subject (idempotent)
    const result = await Chapter.updateMany({}, { $set: { subjectId: subject._id } });

    return res.json({ board: board.name, class: cls.name, subject: subject.name, updatedChapters: result.modifiedCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/curriculum/import
export const importCurriculum = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.lessons)) {
      return res.status(400).json({ message: 'Invalid payload. Expect { board_title?, class_title?, subject_title?, chapter_title?, unit_title?, lessons[] }' });
    }

    // Ensure base hierarchy (Board, Class, Subject)
    const boardName = payload.board_title || 'CBSE';
    const className = String(payload.class_title || '5');
    const subjectName = payload.subject_title || 'Science';

    const board = await Board.findOneAndUpdate(
      { name: boardName },
      { $setOnInsert: { name: boardName } },
      { upsert: true, new: true }
    );
    const classLevel = await ClassLevel.findOneAndUpdate(
      { boardId: board._id, name: className },
      { $setOnInsert: { boardId: board._id, name: className, order: Number(className) || 1 } },
      { upsert: true, new: true }
    );
    const subject = await Subject.findOneAndUpdate(
      { boardId: board._id, classId: classLevel._id, name: subjectName },
      { $setOnInsert: { boardId: board._id, classId: classLevel._id, name: subjectName } },
      { upsert: true, new: true }
    );

    // Chapter title from payload.chapter_title or fallback to unit_title/module_title
    const chapterTitle = payload.chapter_title || 'Chapter';
    const chapter = await Chapter.findOneAndUpdate(
      { subjectId: subject._id, title: chapterTitle },
      { $setOnInsert: { subjectId: subject._id, title: chapterTitle, order: 1 } },
      { upsert: true, new: true }
    );

    // APPEND/UPSERT: keep existing modules; upsert one per lesson by title.
    const existingModules = await Module.find({ chapterId: chapter._id }).sort({ order: 1 });
    const titleToModule = new Map(existingModules.map(m => [String(m.title).trim().toLowerCase(), m]));
    let nextOrder = existingModules.length;

    // For each lesson in payload, create-or-replace a module under the chapter
    let totalItems = 0;
    let skippedItems = 0;
    const perLesson = [];
    // Create/find the Unit (under this chapter) if unit title provided
    const unitTitle = payload.unit_title || 'Unit';
    const unit = await Unit.findOneAndUpdate(
      { chapterId: chapter._id, title: unitTitle },
      { $setOnInsert: { chapterId: chapter._id, title: unitTitle, order: 1 } },
      { upsert: true, new: true }
    );

    for (const lesson of payload.lessons) {
      let module = null;

      // Prefer explicit module_id
      if (payload.module_id) {
        try {
          module = await Module.findById(payload.module_id);
          if (!module) return res.status(400).json({ message: `Provided module_id ${payload.module_id} not found` });
          if (module.chapterId.toString() !== chapter._id.toString()) {
            console.warn('[importCurriculum] Provided module_id belongs to different chapter');
          }
        } catch (e) {
          return res.status(400).json({ message: `Invalid module_id ${payload.module_id}` });
        }
      }

      // Fallback to title lookup
      if (!module) {
        const key = String(lesson.lesson_title || '').trim().toLowerCase();
        module = titleToModule.get(key);
        if (!module) {
          nextOrder += 1;
          module = await Module.create({ chapterId: chapter._id, unitId: unit._id, title: lesson.lesson_title, order: nextOrder });
          titleToModule.set(key, module);
        }
      }

      // Replace mode: clear existing items first
      if (payload.replace === true || String(payload.replace).toLowerCase() === 'true') {
        await CurriculumItem.deleteMany({ moduleId: module._id });
      }

      let order = 0;
      let createdForThisLesson = 0;
      const processedIds = [];
      for (const c of (lesson.concepts || [])) {
        order += 1;
        const base = { moduleId: module._id, order, imageUrl: c.imageUrl || c.image || undefined, images: Array.isArray(c.images) ? c.images.filter(Boolean) : undefined };

        const rawType = String(c.type || '').toLowerCase();
        const isMCQ = rawType === 'multiple-choice' || rawType === 'mcq' || (Array.isArray(c.options) && c.question);
        const isFIB = rawType === 'fill-in-the-blank' || rawType === 'fillups' || rawType === 'fill-in' || (c.question && !Array.isArray(c.options) && typeof c.answer !== 'undefined' && !Array.isArray(c.words));
        const isRearrange = rawType === 'rearrange' || Array.isArray(c.words);
        const isStatement = rawType === 'statement' || rawType === 'concept' || rawType === 'text' || (!isMCQ && !isFIB && !isRearrange && (c.text || c.content));

        const updateData = { ...base };
        if (isStatement) Object.assign(updateData, { type: 'statement', text: c.text || c.content || '' });
        else if (isMCQ) Object.assign(updateData, { type: 'multiple-choice', question: c.question || '', options: (c.options || []).filter(Boolean), answer: c.answer });
        else if (isFIB) Object.assign(updateData, { type: 'fill-in-the-blank', question: c.question || '', answer: c.answer });
        else if (isRearrange) {
          const words = Array.isArray(c.words) ? c.words : (Array.isArray(c.options) ? c.options : []);
          Object.assign(updateData, { type: 'rearrange', question: c.question || '', words, options: words, answer: c.answer });
        } else Object.assign(updateData, { type: 'statement', text: c.text || c.question || JSON.stringify(c) });

        try {
          let itemId = null;
          if (c._id && String(c._id).length === 24) itemId = c._id;

          if (itemId && !(payload.replace === true || String(payload.replace).toLowerCase() === 'true')) {
            const updated = await CurriculumItem.findByIdAndUpdate(itemId, { $set: updateData }, { new: true, runValidators: true });
            if (updated) {
              processedIds.push(updated._id.toString());
            } else {
              const created = await CurriculumItem.create(updateData);
              processedIds.push(created._id.toString());
            }
          } else {
            const created = await CurriculumItem.create(updateData);
            processedIds.push(created._id.toString());
          }
          totalItems += 1;
          createdForThisLesson += 1;
        } catch (_e) {
          skippedItems += 1;
        }
      }

      if (!(payload.replace === true || String(payload.replace).toLowerCase() === 'true') && processedIds.length > 0) {
        await CurriculumItem.deleteMany({ moduleId: module._id, _id: { $nin: processedIds } });
      }

      perLesson.push({ lesson: lesson.lesson_title, items: createdForThisLesson });
    }

    return res.status(201).json({ board: board.name, class: classLevel.name, subject: subject.name, chapter: chapter.title, importedItems: totalItems, skipped: skippedItems, perLesson });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/chapters?board=CBSE&subject=Science
export const listChapters = async (req, res) => {
  try {
    const { board = 'CBSE', subject = 'Science', classTitle, userId } = req.query;
    console.log(`[Curriculum] listChapters called with:`, { board, subject, classTitle, userId });
    
    if (userId) {
      const u = await User.findById(userId).select('subjectId');
      if (u && u.subjectId) {
        const chapters = await Chapter.find({ subjectId: u.subjectId }).sort({ order: 1 });
        console.log(`[Curriculum] Found ${chapters.length} chapters for user subjectId`);
        return res.json(chapters);
      }
    }
    
    // Find board
    const b = await Board.findOne({ name: board });
    if (!b) {
      console.log(`[Curriculum] Board '${board}' not found`);
      return res.json([]);
    }
    console.log(`[Curriculum] Found board:`, b.name);
    
    // Find class if specified
    let cls;
    if (classTitle) {
      cls = await ClassLevel.findOne({ boardId: b._id, name: String(classTitle) });
      if (!cls) {
        console.log(`[Curriculum] Class '${classTitle}' not found for board '${board}'`);
        return res.json([]);
      }
      console.log(`[Curriculum] Found class:`, cls.name);
    }
    
    // Find subject with more flexible matching
    let s = await Subject.findOne({ 
      boardId: b._id, 
      name: subject, 
      ...(cls ? { classId: cls._id } : {}) 
    });
    
    // If not found, try without class constraint
    if (!s && cls) {
      s = await Subject.findOne({ boardId: b._id, name: subject });
      console.log(`[Curriculum] Subject found without class constraint:`, s ? s.name : 'none');
    }
    
    // If still not found, try case-insensitive search
    if (!s) {
      s = await Subject.findOne({ 
        boardId: b._id, 
        name: { $regex: new RegExp(`^${subject}$`, 'i') },
        ...(cls ? { classId: cls._id } : {}) 
      });
      console.log(`[Curriculum] Subject found with case-insensitive search:`, s ? s.name : 'none');
    }
    
    if (!s) {
      console.log(`[Curriculum] Subject '${subject}' not found for board '${board}' and class '${classTitle || 'any'}'`);
      // Return empty array instead of error
      return res.json([]);
    }
    
    console.log(`[Curriculum] Found subject:`, s.name);
    const chapters = await Chapter.find({ subjectId: s._id }).sort({ order: 1 });
    console.log(`[Curriculum] Found ${chapters.length} chapters for subject`);
    return res.json(chapters);
  } catch (err) {
    console.error(`[Curriculum] Error in listChapters:`, err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/curriculum/seed-basic-data
// Creates basic data structure for testing
export const seedBasicData = async (req, res) => {
  try {
    console.log('[Curriculum] Seeding basic data...');
    
    // Create board
    const board = await Board.findOneAndUpdate(
      { name: 'CBSE' },
      { $setOnInsert: { name: 'CBSE' } },
      { upsert: true, new: true }
    );
    console.log('[Curriculum] Board created/found:', board.name);
    
    // Create class
    const classLevel = await ClassLevel.findOneAndUpdate(
      { boardId: board._id, name: '5' },
      { $setOnInsert: { boardId: board._id, name: '5', order: 5 } },
      { upsert: true, new: true }
    );
    console.log('[Curriculum] Class created/found:', classLevel.name);
    
    // Create subject
    const subject = await Subject.findOneAndUpdate(
      { boardId: board._id, classId: classLevel._id, name: 'Science' },
      { $setOnInsert: { boardId: board._id, classId: classLevel._id, name: 'Science' } },
      { upsert: true, new: true }
    );
    console.log('[Curriculum] Subject created/found:', subject.name);
    
    // Create chapter
    const chapter = await Chapter.findOneAndUpdate(
      { subjectId: subject._id, title: 'Temperature And Thermometer' },
      { $setOnInsert: { subjectId: subject._id, title: 'Temperature And Thermometer', order: 1 } },
      { upsert: true, new: true }
    );
    console.log('[Curriculum] Chapter created/found:', chapter.title);
    
    // Create unit
    const unit = await Unit.findOneAndUpdate(
      { chapterId: chapter._id, title: 'Unit 1' },
      { $setOnInsert: { chapterId: chapter._id, title: 'Unit 1', order: 1 } },
      { upsert: true, new: true }
    );
    console.log('[Curriculum] Unit created/found:', unit.title);
    
    // Create modules
    const modules = [
      { title: 'Introduction to Temperature', order: 1 },
      { title: 'What is a Thermometer?', order: 2 },
      { title: 'Types of Thermometers', order: 3 }
    ];
    
    const createdModules = [];
    for (const moduleData of modules) {
      const module = await Module.findOneAndUpdate(
        { chapterId: chapter._id, unitId: unit._id, title: moduleData.title },
        { $setOnInsert: { chapterId: chapter._id, unitId: unit._id, title: moduleData.title, order: moduleData.order } },
        { upsert: true, new: true }
      );
      createdModules.push(module);
    }
    console.log('[Curriculum] Created modules:', createdModules.length);
    
    res.json({
      message: 'Basic data seeded successfully',
      board: board.name,
      class: classLevel.name,
      subject: subject.name,
      chapter: chapter.title,
      unit: unit.title,
      modules: createdModules.length
    });
  } catch (err) {
    console.error('[Curriculum] Error seeding basic data:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/units?chapterId=...
export const listUnits = async (req, res) => {
  try {
    const { chapterId } = req.query;
    if (!chapterId) return res.status(400).json({ message: 'chapterId is required' });
    const units = await Unit.find({ chapterId }).sort({ order: 1 });
    return res.json(units);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/curriculum/backfill-units
// Creates a default Unit per chapter (or for a specific chapterId) and assigns modules missing unitId
export const backfillUnits = async (req, res) => {
  try {
    const { chapterId } = req.body || {};
    const chapterFilter = chapterId ? { _id: chapterId } : {};
    const chapters = await Chapter.find(chapterFilter).select('_id title');
    let created = 0, updatedModules = 0;
    for (const ch of chapters) {
      // Ensure at least one unit exists
      let unit = await Unit.findOne({ chapterId: ch._id });
      if (!unit) {
        unit = await Unit.create({ chapterId: ch._id, title: 'Unit 1', order: 1 });
        created += 1;
      }
      // Assign modules with no unitId
      const resUpdate = await Module.updateMany({ chapterId: ch._id, $or: [{ unitId: { $exists: false } }, { unitId: null }] }, { $set: { unitId: unit._id } });
      updatedModules += resUpdate.modifiedCount || 0;
    }
    return res.json({ chaptersProcessed: chapters.length, unitsCreated: created, modulesAssigned: updatedModules });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/modules?chapterId=...
export const listModules = async (req, res) => {
  try {
    const { chapterId, unitId } = req.query;
    if (!chapterId && !unitId) return res.status(400).json({ message: 'chapterId or unitId is required' });
    const filter = unitId ? { unitId } : { chapterId };
    const modules = await Module.find(filter).sort({ order: 1 });
    return res.json(modules);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/curriculum/items?moduleId=...
export const listItems = async (req, res) => {
  try {
    const { moduleId } = req.query;
    if (!moduleId) return res.status(400).json({ message: 'moduleId is required' });
    const items = await CurriculumItem.find({ moduleId }).sort({ order: 1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};


// PUT /api/curriculum/items/:id/image
export const setItemImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, publicId, images, imagePublicIds, append } = req.body || {};
    if (!imageUrl && !Array.isArray(images)) return res.status(400).json({ message: 'imageUrl or images[] is required' });
    const update = {};
    if (imageUrl) { update.imageUrl = imageUrl; update.imagePublicId = publicId; }
    const shouldAppend = append === true || String(append).toLowerCase() === 'true';
    let item;
    if (Array.isArray(images) && shouldAppend) {
      item = await CurriculumItem.findByIdAndUpdate(
        id,
        { $push: { images: { $each: images.filter(Boolean) }, imagePublicIds: { $each: (imagePublicIds || []).filter(Boolean) } }, ...(imageUrl ? { $set: { imageUrl, imagePublicId: publicId } } : {}) },
        { new: true }
      );
    } else {
      if (Array.isArray(images)) { update.images = images; update.imagePublicIds = imagePublicIds || []; }
      item = await CurriculumItem.findByIdAndUpdate(id, update, { new: true });
    }
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: 'Server Error' });
  }
};


