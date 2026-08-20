import fs from 'fs';
import path from 'path';

const filePath = path.resolve('config/firebase-service-account.json');
const content = fs.readFileSync(filePath, 'utf8');
const base64 = Buffer.from(content).toString('base64');
console.log(base64);
