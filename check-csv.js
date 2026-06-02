import fs from 'fs';

function checkCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    console.log(`\n--- File: ${filePath} ---`);
    console.log("Headers:");
    console.log(lines[0]);
    
    console.log("\nDescriptive/HOT Rows:");
    let found = 0;
    for (let i = 1; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('descriptive') || lower.includes('hot')) {
        console.log(`Line ${i + 1}: ${lines[i]}`);
        found++;
      }
    }
    if (found === 0) console.log("No descriptive or HOT rows found.");
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

checkCSV('D:\\Q&A Biodiversity - Unit 1 (2).csv');
checkCSV('D:\\Q&A Biodiversity - Unit 2.csv');
