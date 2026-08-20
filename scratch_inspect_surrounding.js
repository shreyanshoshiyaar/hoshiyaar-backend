import fs from 'fs';
import Papa from 'papaparse';

const filePath = 'D:\\Pressure - akshit upload - 11 aug.csv';
const content = fs.readFileSync(filePath, 'utf8');

const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
const rows = parsed.data;

console.log("--- Rows 131-135 ---");
for(let i = 131; i <= 135; i++) { console.log(`Row ${i+2}:`, rows[i]); }

console.log("\n--- Rows 307-311 ---");
for(let i = 307; i <= 311; i++) { console.log(`Row ${i+2}:`, rows[i]); }

console.log("\n--- Rows 529-533 ---");
for(let i = 529; i <= 533; i++) { console.log(`Row ${i+2}:`, rows[i]); }
