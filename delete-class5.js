import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ClassLevel from './models/ClassLevel.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import Unit from './models/Unit.js';
import Module from './models/Module.js';
import CurriculumItem from './models/CurriculumItem.js';

dotenv.config();

async function deleteClass5() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB.");
        
        // Find Class 5
        const class5 = await ClassLevel.findOne({ name: '5' });
        if (!class5) {
            console.log("✅ No Class 5 found in the database. It is already clean!");
            process.exit(0);
        }
        
        // Find all subjects under Class 5
        const subjects = await Subject.find({ classId: class5._id });
        console.log(`Found ${subjects.length} subjects under Class 5. Deleting cascading data...`);
        
        let deletedCounts = { chapters: 0, units: 0, modules: 0, items: 0 };

        for (const subj of subjects) {
            const chapters = await Chapter.find({ subjectId: subj._id });
            for (const chap of chapters) {
                const units = await Unit.find({ chapterId: chap._id });
                for (const unit of units) {
                    const modules = await Module.find({ unitId: unit._id });
                    for (const mod of modules) {
                        const items = await CurriculumItem.deleteMany({ moduleId: mod._id });
                        deletedCounts.items += items.deletedCount;
                    }
                    const deletedModules = await Module.deleteMany({ unitId: unit._id });
                    deletedCounts.modules += deletedModules.deletedCount;
                }
                const deletedUnits = await Unit.deleteMany({ chapterId: chap._id });
                deletedCounts.units += deletedUnits.deletedCount;
            }
            const deletedChapters = await Chapter.deleteMany({ subjectId: subj._id });
            deletedCounts.chapters += deletedChapters.deletedCount;
        }
        
        // Delete Subjects and Class 5 itself
        await Subject.deleteMany({ classId: class5._id });
        await ClassLevel.deleteOne({ _id: class5._id });
        
        console.log(`\n🧹 Successfully wiped every trace of Class 5!`);
        console.log(`Deleted: ${deletedCounts.chapters} Chapters, ${deletedCounts.units} Units, ${deletedCounts.modules} Modules, ${deletedCounts.items} Questions/Items.`);
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
}

deleteClass5();
