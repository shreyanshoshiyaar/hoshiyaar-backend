import fs from 'fs';
const file = 'D:\\Mindful eating - A path to a healthy body - CBSE.csv';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split(/\r?\n/).slice(0, 3);
console.log("Headers:");
console.log(lines[0]);
console.log("\nRow 1:");
console.log(lines[1]);
