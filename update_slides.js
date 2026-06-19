import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SystemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String }
}, { timestamps: true });

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);

async function updateSlides() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const newSlides = [
      "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1781872055/img-to-link/tm90kowxqrsdtxxzlmki.webp",
      "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1779864570/img-to-link/dv3bklhkmryuc4flx9dw.webp",
      "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1779454631/img-to-link/v7ay4l74oxcqheyhi7p6.webp",
      "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1778579285/img-to-link/eqdx0kyjrhkruh0ownxd.webp",
      "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1779454630/img-to-link/wnc0unb3lt3m0pcvnwcr.webp",
      "https://res.cloudinary.com/dcxlzfyfp/image/upload/v1781872054/img-to-link/lvndgld8zxovtdffnxan.webp"
    ];

    const result = await SystemSettings.findOneAndUpdate(
      { key: 'homepage_slides' },
      { value: newSlides },
      { new: true, upsert: true }
    );

    console.log('Updated successfully:', result.value.length, 'slides');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateSlides();
