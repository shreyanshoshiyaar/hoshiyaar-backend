import fs from 'fs';
import Papa from 'papaparse';

const filePath = 'D:\\Pressure - akshit upload - 11 aug.csv';
const content = fs.readFileSync(filePath, 'utf8');

const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
const rows = parsed.data;

console.log("Row 133:", rows[131]); // index = 133 - 2
console.log("Row 309:", rows[307]);
console.log("Row 409:", rows[407]);
console.log("Row 531:", rows[529]);
