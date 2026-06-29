const fs = require('fs');
const lines = fs.readFileSync('D:\\Magnets Q&A - Final Akshit Upload 29th June.csv', 'utf8').split('\n');
const difficultLines = lines.filter(l => l.toLowerCase().includes('difficult'));
console.log(difficultLines.slice(0, 5).join('\n'));
