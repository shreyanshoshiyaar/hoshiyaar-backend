import fs from 'fs';
import Papa from 'papaparse';

const filePath = 'D:\\Pressure - akshit upload - 11 aug.csv';
const outPath = 'D:\\Pressure - akshit upload - 11 aug - FIXED.csv';
const content = fs.readFileSync(filePath, 'utf8');

const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
let rows = parsed.data;

const fixedRows = [];
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  // check if row is empty/garbage (no Chapter name, no Question, no Concept)
  if (!row['Chapter name'] && !row['Question'] && !row['Concept'] && !row['Lesson Name']) {
    continue;
  }
  
  // Fix row 409 missing Type
  if (!row['Type'] && row['Question'] && row['Options'] && row['Answer']) {
    row['Type'] = 'MCQ';
  }
  
  fixedRows.push(row);
}

const csvOut = Papa.unparse(fixedRows);
fs.writeFileSync(outPath, csvOut, 'utf8');
console.log(`Saved fixed CSV to ${outPath} with ${fixedRows.length} rows.`);
