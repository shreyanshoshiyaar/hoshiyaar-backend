import fs from 'fs';
const content = fs.readFileSync('D:\\Mindful eating - A path to a healthy body - Mindful eating - A path to a healthy body CBSE.csv', 'utf-8');
const firstLine = content.split(/\r?\n/)[0];
console.log("HEADERS:", firstLine);
