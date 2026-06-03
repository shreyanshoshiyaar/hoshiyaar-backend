import fs from 'fs';
const content = fs.readFileSync('D:\\Electricity - all.csv', 'utf-8');
const firstLine = content.split(/\r?\n/)[0];
console.log(firstLine);
