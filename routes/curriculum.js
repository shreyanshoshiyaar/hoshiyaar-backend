import express from 'express';
import { importCurriculum, listBoards, listClasses, listSubjects, listChapters, listUnits, listModules, listItems, setItemImage, backfillSubjects, backfillUnits, seedBasicData, updateUnit, completeLessons, getRevisionCounts } from '../controllers/curriculumController.js';

const router = express.Router();

router.post('/import', importCurriculum);
router.get('/boards', listBoards);
router.get('/classes', listClasses);
router.get('/subjects', listSubjects);
router.get('/chapters', listChapters);
router.get('/units', listUnits);
router.put('/units/:id', updateUnit);
router.get('/modules', listModules);
router.get('/items', listItems);
router.get('/revision-counts', getRevisionCounts);
router.put('/items/:id/image', setItemImage);
router.post('/backfill-subjects', backfillSubjects);
router.post('/backfill-units', backfillUnits);
router.post('/seed-basic-data', seedBasicData);
router.get('/complete-lessons', completeLessons);

export default router;


