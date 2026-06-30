import express from 'express';
import { importCurriculum, listBoards, listClasses, listSubjects, listChapters, listUnits, listModules, listItems, setItemImage, backfillSubjects, backfillUnits, seedBasicData, updateUnit, completeLessons, getRevisionCounts, toggleChapterPublishStatus } from '../controllers/curriculumController.js';
import { optionalAuth, protect, admin } from '../middleware/authMiddleware.js';
import { cacheResponse } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.post('/import', importCurriculum);
router.get('/boards', listBoards);
router.get('/classes', listClasses);
router.get('/subjects', listSubjects);
router.get('/chapters', optionalAuth, listChapters);
router.patch('/chapters/:id/publish', protect, admin, toggleChapterPublishStatus);
router.get('/units', cacheResponse(900), listUnits);
router.put('/units/:id', updateUnit);
router.get('/modules', cacheResponse(900), listModules);
router.get('/items', listItems);
router.get('/revision-counts', getRevisionCounts);
router.put('/items/:id/image', setItemImage);
router.post('/backfill-subjects', backfillSubjects);
router.post('/backfill-units', backfillUnits);
router.post('/seed-basic-data', seedBasicData);
router.get('/complete-lessons', completeLessons);

export default router;


