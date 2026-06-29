import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const CurriculumItemSchema = new mongoose.Schema({}, { strict: false });
const CurriculumItem = mongoose.models.CurriculumItem || mongoose.model('CurriculumItem', CurriculumItemSchema);

async function fixVideos() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Find all items of type video
    const videoItems = await CurriculumItem.find({ type: 'video' });
    let fixedCount = 0;

    for (const item of videoItems) {
      if (!item.videoUrl && item.images && item.images.length > 0) {
        // Move the first "image" (which is actually a video URL) to videoUrl
        const videoUrl = item.images[0];
        const newImages = item.images.slice(1);
        
        await CurriculumItem.updateOne(
          { _id: item._id },
          { 
            $set: { videoUrl: videoUrl, images: newImages }
          }
        );
        console.log(`Fixed video item ${item._id}: videoUrl -> ${videoUrl}`);
        fixedCount++;
      } else if (!item.videoUrl) {
         // Maybe it's stored in imageUrl?
         if (item.imageUrl) {
            await CurriculumItem.updateOne(
              { _id: item._id },
              { $set: { videoUrl: item.imageUrl }, $unset: { imageUrl: "" } }
            );
            console.log(`Fixed video item ${item._id} from imageUrl -> ${item.imageUrl}`);
            fixedCount++;
         } else {
            console.log(`Warning: Video item ${item._id} has no images or videoUrl`);
         }
      }
    }

    console.log(`\nDone! Fixed ${fixedCount} video items across the database.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

fixVideos();
