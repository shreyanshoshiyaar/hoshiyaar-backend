import fs from 'fs';
import Papa from 'papaparse';

const csvFilePath = 'D:\\Electromagnetism - Final - Akshit - 23 June.csv';

const content = fs.readFileSync(csvFilePath, 'utf8');

Papa.parse(content, {
  header: true,
  skipEmptyLines: true,
  transformHeader: function(h) { return h.trim().toLowerCase(); },
  complete: function(results) {
    const rows = results.data;
    let issuesFound = 0;

    console.log(`Analyzing CSV with ${rows.length} rows...\n`);

    let firstRowLogged = false;

    rows.forEach((row, index) => {
      // Row numbers in CSV usually start at 2 because of header
      const rowNum = index + 2;
      
      if (!firstRowLogged) {
        console.log("Detected headers:", Object.keys(row).join(', '));
        firstRowLogged = true;
      }
      
      const type = (row['type'] || '').trim().toLowerCase();
      const concept = (row['concept'] || '').trim();
      const questions = (row['questions'] || '').trim();
      const options = (row['options'] || '').trim();
      const answers = (row['answers'] || '').trim();
      const img1 = (row['image 1'] || '').trim();
      
      // If the row is essentially completely blank, ignore it
      if (!type && !concept && !questions && !row['lesson_title']) {
        return;
      }

      let rowIssues = [];

      if (!type) {
        rowIssues.push(`Missing 'type'`);
      } else {
        // Validation logic based on type
        if (type === 'comic' || type === 'statement' || type === 'concept') {
          // Requires at least concept text, questions text, OR an image
          if (!concept && !questions && !img1) {
            rowIssues.push(`Type is '${type}' but no text or image provided.`);
          }
        } else if (type === 'mcq' || type === 'multiple-choice') {
          if (!questions) rowIssues.push(`Missing question text.`);
          if (!options) rowIssues.push(`Missing options.`);
          if (!answers) rowIssues.push(`Missing answers.`);
        } else if (type === 'rearrange' || type === 're-arrange') {
          if (!questions) rowIssues.push(`Missing question text.`);
          if (!options) rowIssues.push(`Missing options (words to rearrange).`);
          if (!answers) rowIssues.push(`Missing correct answer sequence.`);
        } else if (type === 'fib' || type === 'fill-in-the-blank') {
          if (!questions && !concept) rowIssues.push(`Missing question/concept text.`);
          if (!answers) rowIssues.push(`Missing answers.`);
        } else if (type === 'descriptive') {
          if (!questions) rowIssues.push(`Missing question text.`);
          if (!concept) rowIssues.push(`Missing model answer/concept.`);
          if (!answers) rowIssues.push(`Missing keywords (Answers).`);
        }
      }

      if (rowIssues.length > 0) {
        issuesFound++;
        console.log(`[Row ${rowNum}] Module: "${row['lesson_title']}" | Type: "${type}"`);
        rowIssues.forEach(issue => console.log(`  - ${issue}`));
        console.log('');
      }
    });

    if (issuesFound === 0) {
      console.log('✅ No obvious structural issues found (all required fields are present).');
    } else {
      console.log(`⚠️ Found issues in ${issuesFound} rows.`);
    }
  }
});
