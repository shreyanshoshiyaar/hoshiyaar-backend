import { execSync } from 'child_process';
import fs from 'fs';

console.log("🚀 Starting database restoration...");

try {
  if (fs.existsSync('./seedDatabase.js')) {
    console.log("\n1️⃣ Running seedDatabase.js...");
    execSync("node seedDatabase.js", { stdio: 'inherit' });
  }

  if (fs.existsSync('./import-lesson-data.js')) {
    console.log("\n2️⃣ Running import-lesson-data.js...");
    execSync("node import-lesson-data.js", { stdio: 'inherit' });
  }

  if (fs.existsSync('./import-nidhi-flow.js')) {
    console.log("\n3️⃣ Running import-nidhi-flow.js...");
    execSync("node import-nidhi-flow.js", { stdio: 'inherit' });
  }
  
  console.log("\n✅ Base modules restored successfully!");
} catch (error) {
  console.error("❌ Error during restoration:", error.message);
}
