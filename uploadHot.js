import fs from 'fs';
import Papa from 'papaparse';
import axios from 'axios';

const files = [
  {
    path: "D:\\Mindful eating - A path to a healthy body - Eduvate - final - 8th June.csv",
    board: "Eduvate (CBSE)", cls: "6", sub: "Science",
    chKey: 'Eduvate chapter title', unKey: 'Eduvate Unit Title', lesKey: 'Lesson Title',
    typeKey: 'Question Type', textKey: 'Concept', qKey: 'Questions', optKey: 'Options', ansKey: 'Answer', revKey: 'Revision'
  },
  {
    path: "D:\\Mindful eating - A path to a healthy body - CBSE - final - 5th June.csv",
    board: "CBSE", cls: "6", sub: "Science",
    chKey: 'CBSE chapter title', unKey: 'CBSE Unit Title', lesKey: 'Lesson Title',
    typeKey: 'Question Type', textKey: 'Concept', qKey: 'Questions', optKey: 'Options', ansKey: 'Answer', revKey: 'Revision'
  },
  {
    path: "D:\\Q&A Biodiversity - Unit 1 (4).csv",
    board: "CBSE", cls: "6", sub: "Science",
    chKey: 'Chapter_title', unKey: 'Unit_title', lesKey: 'lesson_title',
    typeKey: 'type', textKey: 'concept/statement', qKey: 'Question', optKey: 'Options', ansKey: 'answer', revKey: 'Revise?'
  },
  {
    path: "D:\\Q&A Biodiversity - Unit 2 (2).csv",
    board: "CBSE", cls: "6", sub: "Science",
    chKey: 'Chapter_title', unKey: 'Unit_title', lesKey: 'lesson_title',
    typeKey: 'type', textKey: 'concept/statement', qKey: 'question', optKey: 'Options', ansKey: 'answer', revKey: 'Revise'
  },
  {
    path: "D:\\Measurements and Motions - Unit 1 (2).csv",
    board: "Eduvate (CBSE)", cls: "6", sub: "Science",
    chKey: 'Chapter_title', unKey: 'Unit_title', lesKey: 'lesson_title',
    typeKey: 'type', textKey: 'concept/statement', qKey: 'question', optKey: 'Options', ansKey: 'answer', revKey: 'Revise?'
  },
  {
    path: "D:\\Measurements and Motions - Unit 2 (2).csv",
    board: "Eduvate (CBSE)", cls: "6", sub: "Science",
    chKey: 'Chapter_title', unKey: 'Unit_title', lesKey: 'lesson_title',
    typeKey: 'type', textKey: 'concept/statement', qKey: 'question', optKey: 'Options', ansKey: 'answer', revKey: 'Revise?'
  }
];

const processFile = async (cfg) => {
  const content = fs.readFileSync(cfg.path, 'utf8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  
  const hotRows = parsed.data.filter(r => {
    const title = String(r[cfg.lesKey] || '').trim();
    return /hot module|difficult module/i.test(title);
  });
  
  if (hotRows.length === 0) {
    console.log(`No hot modules found in ${cfg.path}`);
    return;
  }

  // Group by Unit
  const units = {};

  for (const row of hotRows) {
    let un = String(row[cfg.unKey] || '').trim();
    if (!un && cfg.path.includes("Biodiversity - Unit 1")) un = "Unit 1: Plant Characteristics and Grouping";
    if (!un && cfg.path.includes("Biodiversity - Unit 2")) un = "Unit 2: Animal Movement, Habitats, and Adaptations";
    if (!un) un = "Default Unit";
    
    let ch = String(row[cfg.chKey] || '').trim();
    if (!ch && cfg.path.includes("Biodiversity")) ch = "Chapter 2: Diversity in the Living World";
    if (!ch && cfg.path.includes("Mindful eating")) ch = "Chapter 3: Mindful eating - A path to a healthy body";
    if (!ch && cfg.path.includes("Measurements")) ch = "Chapter 1: Measurement and motion";
    
    if (!units[un]) units[un] = { chapter: ch, concepts: [] };
    
    const typeRaw = String(row[cfg.typeKey] || '').trim();
    let mappedType = typeRaw.toLowerCase();
    if (mappedType === 'mcq') mappedType = 'mcq';
    if (mappedType === 'fib') mappedType = 'fillups';
    if (mappedType === 're-arrange') mappedType = 'rearrange';
    if (mappedType === 'comic') mappedType = 'comic';
    if (mappedType === 'concept') mappedType = 'concept';
    
    let optionsRaw = String(row[cfg.optKey] || '').trim();
    let options = [];
    if (optionsRaw) options = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);
    
    const imgKeys = Object.keys(row).filter(k => k.toLowerCase().includes('image'));
    const images = imgKeys.map(k => String(row[k] || '').trim()).filter(Boolean);
    
    units[un].concepts.push({
      type: mappedType,
      text: String(row[cfg.textKey] || '').trim(),
      question: String(row[cfg.qKey] || '').trim(),
      options: options,
      words: (mappedType === 'rearrange') ? options : undefined,
      answer: String(row[cfg.ansKey] || '').trim(),
      revise: String(row[cfg.revKey] || '').trim(),
      imageUrl: images[0] || '',
      images
    });
    
    // Store original lesson title for the unit payload
    if (!units[un].lesson_title) {
      units[un].lesson_title = String(row[cfg.lesKey] || '').trim();
    }
  }

  for (const [unitTitle, data] of Object.entries(units)) {
    const payload = {
      board_title: cfg.board,
      class_title: cfg.cls,
      subject_title: cfg.sub,
      chapter_title: data.chapter,
      unit_title: unitTitle,
      replace: true,
      lessons: [
        {
          lesson_title: data.lesson_title || "HOT MODULE",
          concepts: data.concepts
        }
      ]
    };

    console.log(`Uploading ${data.concepts.length} items to ${cfg.board} > ${data.chapter} > ${unitTitle}`);
    try {
      const res = await axios.post('http://localhost:5000/api/curriculum/import', payload);
      console.log(`Success:`, res.data.importedItems, "items imported.");
    } catch (err) {
      console.error(`Error uploading:`, err.response?.data || err.message);
    }
  }
};

const run = async () => {
  for (const cfg of files) {
    await processFile(cfg);
  }
};

run();
