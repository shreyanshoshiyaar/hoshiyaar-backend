import fs from 'fs';
import Papa from 'papaparse';

const filePath = 'D:\\Pressure - akshit upload - 11 aug.csv';
const content = fs.readFileSync(filePath, 'utf8');

const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
let rows = parsed.data;

const fixedRows = [];
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  
  // Fix row 409 missing Type
  if (!row['Type'] && row['Question'] && row['Options'] && row['Answer']) {
    row['Type'] = 'MCQ';
  }

  // If a row is essentially blank but has '#N/A' in image, we can just clear that cell to make it truly empty
  // so that other systems or the upload script can gracefully skip it
  if (!row['Chapter name'] && !row['Question'] && !row['Concept'] && !row['Lesson Name']) {
    if (row['Image 1.'] === '#N/A') {
      row['Image 1.'] = '';
    }
  }
  
  fixedRows.push(row);
}

const csvOut = Papa.unparse(fixedRows);
fs.writeFileSync(filePath, csvOut, 'utf8');
console.log(`Overwrote original CSV at ${filePath}`);
