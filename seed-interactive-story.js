import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InteractiveStory from './models/InteractiveStory.js';

dotenv.config();

const seedStory = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const storyData = {
      board: 'CBSE', 
      classLevel: '6', 
      backgroundImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680580/img-to-link/n6forvaeji2evhwntkwr.webp',
      backgroundMusic: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783685549/hoshiyaar_audio/plrtlcjh5lroqpvlsqag.mp3', 
      isActive: true,
      slides: [
        // Screen 1: Welcome
        {
          characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680574/img-to-link/l9dy1jdvdvqbmmbnmlxs.webp',
          dialogue: "Hey, science explorer! Ready for some science magic?",
          audioUrl: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783683878/hoshiyaar_audio/pk45lj2fydmhf2cmtiey.mp3',
          buttons: [{ label: "✨ Start", nextSlideIndex: 1 }]
        },
        // Screen 2: Meet the Stars
        {
          characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680578/img-to-link/husmo24q9cfphvkipza0.webp',
          dialogue: "Meet today’s science stars — Acids and Bases!",
          audioUrl: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783683881/hoshiyaar_audio/cnftifhmlh6nczsasjk4.mp3',
          buttons: [{ label: "🌟 Meet Them", nextSlideIndex: 2 }]
        },
        // Screen 3: Acid Example Question
        {
          characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680581/img-to-link/bkzamgsvqk4rowbppewf.webp',
          dialogue: "What does lemon 🍋 taste like?",
          audioUrl: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783683883/hoshiyaar_audio/y9pio9ogya06msnk42gv.mp3',
          buttons: [
            { label: "A. Sweet", nextSlideIndex: -1, isWrong: true },
            { label: "B. Sour 😖", nextSlideIndex: 3, isWrong: false }
          ]
        },
        // Screen 3.5: Acid Example Correct (Hoshi saying right)
        {
          characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680581/img-to-link/bkzamgsvqk4rowbppewf.webp',
          dialogue: "Right! Lemon is sour because it has an acid.",
          audioUrl: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783683886/hoshiyaar_audio/xqnmfn7otuki7logjq1j.mp3',
          buttons: [{ label: "✅ Next", nextSlideIndex: 4 }]
        },
        // Screen 4: Base Example Question
        {
          characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680579/img-to-link/fy33oqveh3bi43lzhgks.webp',
          dialogue: "I spilled something on my shirt. What should I use?",
          audioUrl: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783683888/hoshiyaar_audio/eapuk3mxq6g1ybkhp093.mp3',
          buttons: [
            { label: "A. Soap", nextSlideIndex: 5, isWrong: false },
            { label: "B. Sugar", nextSlideIndex: -1, isWrong: true }
          ]
        },
        // Screen 4.5: Base Example Correct (Myra saying right)
        {
          characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680577/img-to-link/jz2ij3ppe16m9ia3syaw.webp',
          dialogue: "Correct! Soap is basic in nature.",
          audioUrl: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783683892/hoshiyaar_audio/ypro6kltakwahjvpe3ox.mp3',
          buttons: [{ label: "😊 Next", nextSlideIndex: 6 }]
        },
        // Screen 5: Let's Begin
        {
          characterImg: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1783680578/img-to-link/husmo24q9cfphvkipza0.webp',
          dialogue: "Great! Now let’s explore Acids and Bases in real life.",
          audioUrl: 'https://res.cloudinary.com/dcxlzfyfp/video/upload/v1783683894/hoshiyaar_audio/dfdqpu23glof5dxicszh.mp3',
          buttons: [{ label: "🚀 Let’s Go", nextSlideIndex: -1 }]
        }
      ]
    };

    await InteractiveStory.findOneAndDelete({ board: storyData.board, classLevel: storyData.classLevel });
    await InteractiveStory.create(storyData);
    
    console.log('🎉 Interactive Story Seeded Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding story:', error);
    process.exit(1);
  }
};

seedStory();
