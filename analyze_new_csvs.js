import fs from 'fs';
import Papa from 'papaparse';

const analyzeCsv = (file) => {
  const data = Papa.parse(fs.readFileSync(file, 'utf8'), { header: true, skipEmptyLines: true }).data;
  if (data.length === 0) {
    console.log(`\nFile: ${file} is empty.`);
    return;
  }
  console.log(`\n==========================================`);
  console.log(`File: ${file}`);
  console.log(`Headers:`, Object.keys(data[0]));
  
  // Find a descriptive question
  const desc = data.find(r => String(r.type || '').trim().toLowerCase().includes('descriptive'));
  if (desc) {
    console.log(`\nSample Descriptive Question:`, desc);
  } else {
    console.log(`\nNo Descriptive Question found.`);
  }

  // Find a difficult module question with images
  const diff = data.find(r => String(r.lesson_title || '').trim().toLowerCase().includes('difficult module'));
  if (diff) {
    console.log(`\nSample Difficult Module Question:`, diff);
  }
  
  // Check Revise column values
  const reviseValues = new Set();
  data.forEach(r => {
    const rev = r['Revise?'] || r['Revise'] || r['revise'] || r['revise?'] || '';
    if (rev) reviseValues.add(rev.trim());
  });
  console.log(`\nRevise column values found:`, Array.from(reviseValues));
};

analyzeCsv('D:\\Q&A Biodiversity - Unit 1 (5).csv');
analyzeCsv('D:\\Q&A Biodiversity - Unit 2 (3).csv');
