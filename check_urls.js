import fs from 'fs';
import Papa from 'papaparse';

const checkUrls = (file) => {
  const data = Papa.parse(fs.readFileSync(file, 'utf8'), { header: true, skipEmptyLines: true }).data;
  let allUrls = 0;
  let nonHttp = 0;
  data.forEach(r => {
    Object.keys(r).filter(k=>k.toLowerCase().includes('image')).forEach(k => {
      const v = String(r[k]||'').trim();
      if (v) {
        if (v.includes('cloudinary')) {
          allUrls++;
          if (!v.startsWith('http')) {
            nonHttp++;
            console.log('Non-HTTP:', v);
          }
        } else if (v.startsWith('http')) {
          allUrls++;
        }
      }
    });
  });
  console.log(`File ${file}: Total URLs=${allUrls}, Non-HTTP URLs=${nonHttp}`);
};

checkUrls('D:\\Q&A Biodiversity - Unit 2 (3).csv');
