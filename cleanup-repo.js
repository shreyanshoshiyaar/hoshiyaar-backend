import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToDelete = [
  'check-boards.js', 'check-counts.js', 'check-data.js', 'check-extra-module.js',
  'check-hierarchy.js', 'check-modules-items.js', 'check-units.js', 'check_akshit.js',
  'diag-units.js', 'auth-diagnostic.js', 'db-diagnostic.js', 'audit-diversity.js',
  'verify-import.js', 'test-db.js', 'assign_schools.js', 'cleanup-extra-units.js',
  'cleanup-unit2.js', 'complete-all-modules.js', 'credit-stars-akshit.js',
  'grant-admin-akshit.js', 'delete-extra-unit.js', 'delete-rogue-module.js',
  'delete-rogue-unit.js', 'fix-db.js', 'update-admin-roles.js', 'drop-email-index.js',
  'seed-host-users.js', 'seed-manual-users.js', 'delete-and-reimport-ch2.js',
  'delete-and-reimport-unit1.js', 'delete-and-reimport-unit2.js', 'import-diversity-animal.js',
  'import-diversity.js', 'import-measurement-motion.js', 'import-new-units.js',
  'import-unit2.js', 'reimport-biodiversity-final.js', 'reimport-biodiversity-unit1.js',
  'hierarchy-output.txt', 'test-db-out.txt', 'dump.json', 'modules_check.txt',
  'sheets.json', '{"'
];

filesToDelete.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    } catch (err) {
      console.error(`Error deleting ${file}: ${err.message}`);
    }
  } else {
    console.log(`Not found: ${file}`);
  }
});
