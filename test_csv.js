import fs from 'fs';
import { parse } from 'csv-parse';

const readCSV = (filePath) => {
  return new Promise((resolve) => {
    let count = 0;
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        const v = String(row['Revise?'] || row.Revise || row.revise || row['revise?'] || row['Revise?\\r'] || '').trim().replace(/\r/g, '').toLowerCase();
        if (v === 'y' || v === 'yes') count++;
        // also check fallback keys
        const keys = Object.keys(row);
        for(const k of keys) {
            if(k.toLowerCase().includes('revise')) {
                const val = String(row[k]).trim().replace(/\r/g, '').toLowerCase();
                if ((val === 'y' || val === 'yes') && v !== 'y' && v !== 'yes') {
                    count++;
                    break;
                }
            }
        }
      })
      .on('end', () => resolve(count));
  });
};

const run = async () => {
  const c1 = await readCSV('D:/Q&A Biodiversity - Unit 1 (5).csv');
  console.log('Unit 1 parsed Y:', c1);
  const c2 = await readCSV('D:/Q&A Biodiversity - Unit 2 (3).csv');
  console.log('Unit 2 parsed Y:', c2);
};
run();
