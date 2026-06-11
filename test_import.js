import axios from 'axios';
const run = async () => {
  const payload2 = {
    board_title: "CBSE",
    class_title: "6",
    subject_title: "Science",
    chapter_title: "Chapter 2: Diversity in the Living World",
    unit_title: "Unit 2: Animal Movement, Habitats, and Adaptations",
    replace: true,
    lessons: [
      {
        lesson_title: "Difficult Module TEST",
        concepts: [
          { type: 'concept', text: 'This is a test concept' }
        ]
      }
    ]
  };
  const res = await axios.post('http://localhost:5000/api/curriculum/import', payload2);
  console.log(res.data);
};
run();
