import fs from 'fs';
import csvParser from 'csv-parser';

const processCsv = (filepath) => {
  return new Promise((resolve, reject) => {
    let headerCounts = {};
    let rowCount = 0;
    let reviseCount = 0;

    fs.createReadStream(filepath)
      .pipe(csvParser({
        mapHeaders: ({ header }) => {
          const h = header.trim();
          if (!h) return h;
          headerCounts[h] = (headerCounts[h] || 0) + 1;
          if (headerCounts[h] > 1) {
            return `${h} ${headerCounts[h]}`;
          }
          return h;
        }
      }))
      .on('data', (row) => {
        rowCount++;
        const reviseRaw = String(row['Revise?'] || row.Revise || row.revise || row['revise?'] || '').trim().toLowerCase();
        const revise = (reviseRaw === 'y' || reviseRaw === 'yes');
        if (revise) {
          reviseCount++;
          // console.log(`[Revise] Row ${rowCount} in ${filepath}: ${row.type}`);
        }
      })
      .on('end', () => resolve({ rowCount, reviseCount }))
      .on('error', reject);
  });
};

const run = async () => {
  const file1 = 'D:/Q&A Biodiversity - Unit 1 (5).csv';
  const file2 = 'D:/Q&A Biodiversity - Unit 2 (3).csv';
  
  const res1 = await processCsv(file1);
  console.log(`${file1}: Total rows: ${res1.rowCount}, Revise rows: ${res1.reviseCount}`);
  
  const res2 = await processCsv(file2);
  console.log(`${file2}: Total rows: ${res2.rowCount}, Revise rows: ${res2.reviseCount}`);
};

run();
