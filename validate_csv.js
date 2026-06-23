import fs from 'fs';
import Papa from 'papaparse';

const file = 'D:\\\\Electromagnetism - Final - Akshit - 23 June.csv';

const rawData = fs.readFileSync(file, 'utf8');
const parsed = Papa.parse(rawData, { header: true, skipEmptyLines: true }).data;

let errors = 0;

parsed.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for 0-index, +1 for header
    
    // 1. Check type
    const type = String(row.type || row.Type || '').trim().toLowerCase();
    if (!['mcq', 'fib', 're-arrange', 'comic', 'concept', 'statement', 'descriptive'].includes(type)) {
        console.log(`Row ${rowNum}: Unknown type "${type}"`);
        errors++;
    }

    // 2. Check MCQ
    if (type === 'mcq') {
        const optionsRaw = String(row.Options || row.options || '').trim();
        const options = optionsRaw ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : [];
        if (options.length < 2) {
            console.log(`Row ${rowNum}: MCQ has fewer than 2 options: "${optionsRaw}"`);
            errors++;
        }
        const answer = String(row.Answers || row.Answer || row.answer || '').trim();
        if (!answer) {
            console.log(`Row ${rowNum}: MCQ is missing an answer.`);
            errors++;
        } else {
            // Ensure answer exists in options
            const ansMatched = options.some(o => o.toLowerCase() === answer.toLowerCase());
            if (!ansMatched) {
                console.log(`Row ${rowNum}: MCQ Answer "${answer}" does NOT exactly match any of the options [${options.join(' | ')}].`);
                errors++;
            }
        }
    }

    // 3. Check Comic
    if (type === 'comic') {
        const img1 = String(row['Image 1'] || row['image 1'] || '').trim();
        if (!img1) {
            console.log(`Row ${rowNum}: Comic is missing Image 1.`);
            errors++;
        }
    }
});

if (errors === 0) {
    console.log('✅ No obvious errors found in the CSV. The format looks clean!');
} else {
    console.log(`❌ Found ${errors} potential errors in the CSV.`);
}
