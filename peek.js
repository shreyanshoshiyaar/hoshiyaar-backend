import fs from 'fs';
import Papa from 'papaparse';

const files = [
  "D:\\Mindful eating - A path to a healthy body - Eduvate - final - 8th June.csv",
  "D:\\Mindful eating - A path to a healthy body - CBSE - final - 5th June.csv",
  "D:\\Q&A Biodiversity - Unit 1 (4).csv",
  "D:\\Q&A Biodiversity - Unit 2 (2).csv",
  "D:\\Measurements and Motions - Unit 1 (2).csv",
  "D:\\Measurements and Motions - Unit 2 (2).csv"
];

for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    if (parsed.data.length > 0) {
      console.log(`\n--- ${f} ---`);
      console.log("Headers:", Object.keys(parsed.data[0]));
      console.log("Row 0 Board/Class/Chapter/Unit:", {
        board: parsed.data[0].Board_title || parsed.data[0].Board,
        cls: parsed.data[0].Class_title || parsed.data[0].Class,
        ch: parsed.data[0].Chapter_title || parsed.data[0].Chapter,
        un: parsed.data[0].Unit_title || parsed.data[0].Unit
      });
      
      const hotLessons = new Set(parsed.data.filter(r => {
        const title = r.lesson_title || r['Lesson Title'] || '';
        return /hot module|difficult module/i.test(title);
      }).map(r => r.lesson_title || r['Lesson Title']));
      console.log("HOT Lessons found:", Array.from(hotLessons));
    }
  } catch (err) {
    console.error(`Error reading ${f}:`, err.message);
  }
}
