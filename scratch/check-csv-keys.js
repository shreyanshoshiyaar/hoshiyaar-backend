import fs from 'fs';
import Papa from 'papaparse';

const CSV_FILE = 'D:\\Adolescence  - Appended .csv';
const content = fs.readFileSync(CSV_FILE, 'utf-8');

const headerCounts = {};
const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: function(header) { 
        const h = header.trim().toLowerCase();
        if (!headerCounts[h]) {
            headerCounts[h] = 1;
            return h;
        } else {
            return `ignore_duplicate_${Math.random()}`;
        }
    }
});

console.log("Keys in row 0:", Object.keys(parsed.data[0]));
console.log("Row 0 data:", parsed.data[0]);
