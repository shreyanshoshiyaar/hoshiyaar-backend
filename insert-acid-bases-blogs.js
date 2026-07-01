import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Blog from './models/Blog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const blogs = [
  {
    title: "Difference Between Acid and Base | Class 7 CBSE Science",
    slug: "difference-between-acid-and-base-class-7",
    category: "acid-bases",
    excerpt: "Ruhaan could tell lemon juice and baking soda were different — one was sharp and sour, one tasted bitter and felt slippery. This post covers every difference between acids and bases.",
    tags: ["Class 7 Science", "CBSE", "Acids Bases and Salts", "Difference"],
    image: "",
    content: `
<p>Ruhaan could tell lemon juice and baking soda were different — one was sharp and sour, one tasted bitter and felt slippery. But how does science explain that difference? And how do we test it without just tasting? This post covers every difference between acids and bases — the kind that shows up in 3-mark and 5-mark exam questions.</p>

<h2>Properties of Acids vs Bases — Side by Side</h2>
<p>This is the comparison table to know for your exam. Every row is a potential exam question.</p>

<div style="overflow-x: auto; margin-bottom: 1.5rem;">
  <table style="width: 100%; border-collapse: collapse; text-align: left;">
    <thead>
      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 0.75rem;">Property</th>
        <th style="padding: 0.75rem;">Acid</th>
        <th style="padding: 0.75rem;">Base</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Taste</strong></td>
        <td style="padding: 0.75rem;">Sour</td>
        <td style="padding: 0.75rem;">Bitter</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Feel</strong></td>
        <td style="padding: 0.75rem;">No special feel</td>
        <td style="padding: 0.75rem;">Soapy / slippery</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Effect on blue litmus</strong></td>
        <td style="padding: 0.75rem;">Turns red</td>
        <td style="padding: 0.75rem;">No change</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Effect on red litmus</strong></td>
        <td style="padding: 0.75rem;">No change</td>
        <td style="padding: 0.75rem;">Turns blue</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Effect on turmeric</strong></td>
        <td style="padding: 0.75rem;">No change (stays yellow)</td>
        <td style="padding: 0.75rem;">Turns red</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Effect on China rose</strong></td>
        <td style="padding: 0.75rem;">Dark pink / magenta</td>
        <td style="padding: 0.75rem;">Turns green</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Nature</strong></td>
        <td style="padding: 0.75rem;">Acidic</td>
        <td style="padding: 0.75rem;">Basic / alkaline</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Common examples</strong></td>
        <td style="padding: 0.75rem;">Lemon juice, vinegar, curd, tamarind</td>
        <td style="padding: 0.75rem;">Baking soda, soap, lime water, washing soda</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem;"><strong>Reaction with each other</strong></td>
        <td colspan="2" style="padding: 0.75rem;">Acid + Base → Salt + Water (Neutralisation)</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>The Litmus Test — How It Works</h2>
<p>The litmus test is the standard method for identifying acids and bases in Class 7 Science. Litmus is a natural dye extracted from lichens. It comes in two forms:</p>
<h3>Blue litmus paper</h3>
<ul>
  <li>Dip in an acid → turns red</li>
  <li>Dip in a base → stays blue (no change)</li>
  <li>Dip in a neutral solution → stays blue (no change)</li>
</ul>
<h3>Red litmus paper</h3>
<ul>
  <li>Dip in a base → turns blue</li>
  <li>Dip in an acid → stays red (no change)</li>
  <li>Dip in a neutral solution → stays red (no change)</li>
</ul>

<div style="background-color: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <div style="font-weight: bold; color: #16a34a; margin-bottom: 0.5rem;">✅ Exam-ready answer</div>
  <p style="margin: 0 0 0.5rem 0; font-weight: 600;">Q: How can you use litmus paper to identify whether a solution is acidic or basic?</p>
  <p style="margin: 0; color: #14532d;">A: Dip a piece of blue litmus paper into the solution. If it turns red, the solution is acidic. If there is no change, it may be basic or neutral. Then dip a piece of red litmus paper. If it turns blue, the solution is basic. If neither paper changes colour, the solution is neutral.</p>
</div>

<div style="background-color: #fef2f2; padding: 1rem; border-left: 4px solid #ef4444; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <div style="font-size: 0.875rem; font-weight: bold; color: #dc2626; margin-bottom: 0.5rem; text-transform: uppercase;">⚠️ Common mistake</div>
  <p style="margin: 0; color: #991b1b;">"If blue litmus doesn't change, the solution must be neutral." — This is not necessarily true. Blue litmus not changing only tells you the solution is not acidic. It could still be basic or neutral. You need to test with red litmus as well to be sure.</p>
</div>

<h2>Examples — Acids and Bases You Already Know</h2>
<div style="overflow-x: auto; margin-bottom: 1.5rem;">
  <table style="width: 100%; border-collapse: collapse; text-align: left;">
    <thead>
      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 0.75rem;">Substance</th>
        <th style="padding: 0.75rem;">Acid / Base / Neutral</th>
        <th style="padding: 0.75rem;">Acid/Base present</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">Lemon juice</td>
        <td style="padding: 0.75rem;">Acid</td>
        <td style="padding: 0.75rem;">Citric acid</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">Vinegar</td>
        <td style="padding: 0.75rem;">Acid</td>
        <td style="padding: 0.75rem;">Acetic acid</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">Baking soda</td>
        <td style="padding: 0.75rem;">Base</td>
        <td style="padding: 0.75rem;">Sodium bicarbonate</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">Soap</td>
        <td style="padding: 0.75rem;">Base</td>
        <td style="padding: 0.75rem;">Sodium hydroxide</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">Pure water</td>
        <td style="padding: 0.75rem;">Neutral</td>
        <td style="padding: 0.75rem;">—</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>What Happens When Acid Meets Base?</h2>
<p>When an acid and a base come together, they react in a process called neutralisation. They cancel each other out and form two new substances:</p>
<p><strong>Neutralisation reaction:</strong> Acid + Base → Salt + Water</p>
<p>Example: Hydrochloric acid + Sodium hydroxide → Sodium chloride (table salt) + Water</p>
<p>After neutralisation, the solution is neither acidic nor basic — it is neutral (if exact amounts are used).</p>

<h2>What Is a Neutral Substance?</h2>
<p>A neutral substance is one that is neither acidic nor basic. It does not change the colour of blue or red litmus paper. The most common example of a neutral substance is pure water. Table salt dissolved in water is also approximately neutral.</p>

<h2>Exam-Ready Answers</h2>
<p>✅ <strong>3-mark answer</strong><br/>Q: State three differences between acids and bases.<br/>A:<br/>1. Taste: Acids taste sour. Bases taste bitter.<br/>2. Effect on litmus: Acids turn blue litmus red. Bases turn red litmus blue.<br/>3. Feel: Acids have no special feel. Bases feel soapy or slippery to touch.</p>

<hr style="margin: 2rem 0; border: 0; border-top: 1px solid #e5e7eb;" />

<h2>Frequently Asked Questions</h2>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is the difference between acid and base?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Acids taste sour, turn blue litmus red, and are found in substances like lemon juice and vinegar. Bases taste bitter, feel soapy, turn red litmus blue, and are found in substances like baking soda and soap. They react with each other to form salt and water in a neutralisation reaction.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What happens when an acid and a base are mixed?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">A neutralisation reaction occurs. The acid and base react to form salt and water. The resulting solution is neutral. General equation: Acid + Base → Salt + Water.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">How does litmus paper help distinguish between acids and bases?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Blue litmus paper turns red in acids and stays unchanged in bases. Red litmus paper turns blue in bases and stays unchanged in acids. If neither paper changes colour, the solution is neutral.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is a neutral substance?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">A neutral substance is neither acidic nor basic. It does not change the colour of blue or red litmus paper. Pure water is the most common example of a neutral substance.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">Does turmeric change colour with acids?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">No. Turmeric does not change colour in acidic solutions — it stays yellow. Turmeric turns red only in basic (alkaline) solutions. This is why a turmeric stain turns red when you apply soap (a base) to it.</p>
  </details>
</div>
`
  },
  {
    title: "Acids, Bases and Salts Class 7 Notes | CBSE Science Chapter 5",
    slug: "acids-bases-and-salts-class-7-notes",
    category: "acid-bases",
    excerpt: "Understanding acids, bases, and salts is one of the most practical chapters in Class 7 Science — everything from your food to your stomach to your soap connects to it.",
    tags: ["Class 7 Science", "CBSE", "Acids Bases and Salts", "Notes"],
    image: "",
    content: `
<p>Hoshi squeezed a lemon into his tea and it tasted sharp and sour. Then he added baking soda to neutralise it — and it fizzed. Two everyday substances, completely opposite in nature. One is an acid, one is a base. Understanding acids, bases, and salts is one of the most practical chapters in Class 7 Science — everything from your food to your stomach to your soap connects to it.</p>

<h2>What Are Acids?</h2>
<div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <p style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e3a8a;">Acids are substances that taste sour and turn blue litmus red.</p>
</div>
<p>The word "acid" comes from the Latin word acidus, meaning sour. You've tasted acids without knowing it — the sourness of a lemon, tamarind, or curd comes from the acids present in them.</p>

<h2>What Are Bases?</h2>
<div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <p style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e3a8a;">Bases are substances that taste bitter, feel soapy or slippery, and turn red litmus blue.</p>
</div>
<p>Bases are the opposite of acids. The bitterness of bitter gourd (karela), the slippery feel of soap, the feel of baking soda — all of these are characteristics of bases.</p>

<h2>What Are Indicators?</h2>
<p>An indicator is a substance that changes colour in the presence of an acid or a base, helping us identify whether a substance is acidic or basic. Indicators are tools scientists use to test substances without tasting them.</p>

<h2>Litmus — The Most Important Indicator</h2>
<p>Litmus is a natural dye extracted from lichens. It is the most commonly used indicator in Class 7 Science.</p>
<ul>
  <li><strong>Blue litmus</strong> — turns red in acidic solutions; stays blue in basic solutions</li>
  <li><strong>Red litmus</strong> — turns blue in basic solutions; stays red in acidic solutions</li>
</ul>

<h2>Neutralisation Reaction</h2>
<p><strong>Acid + Base → Salt + Water</strong></p>
<p>When an acid and a base are mixed together, they react and cancel each other out. The acid becomes less acidic, the base becomes less basic, and the resulting solution is neutral (or close to neutral). This reaction is called neutralisation.</p>
<p>The products formed are: Salt and Water.</p>
<p>Example: Hydrochloric acid (HCl) + Sodium hydroxide (NaOH) → Sodium chloride (NaCl) + Water (H₂O)</p>

<h2>What Are Salts?</h2>
<p>Salts are the products of a neutralisation reaction between an acid and a base. They are ionic compounds that are generally neutral — though some can be slightly acidic or basic.</p>
<ul>
  <li>Common salt (table salt) — sodium chloride (NaCl)</li>
  <li>Baking soda — sodium bicarbonate (NaHCO₃)</li>
  <li>Washing soda — sodium carbonate (Na₂CO₃)</li>
</ul>

<hr style="margin: 2rem 0; border: 0; border-top: 1px solid #e5e7eb;" />

<h2>Frequently Asked Questions</h2>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What are acids, bases and salts in Class 7?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Acids are sour substances that turn blue litmus red. Bases are bitter, soapy substances that turn red litmus blue. Salts are formed when acids react with bases in a neutralisation reaction (e.g. common salt — NaCl).</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is an indicator?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">An indicator is a substance that changes colour in the presence of an acid or a base. It is used to test whether a substance is acidic or basic.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is neutralisation?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Neutralisation is the reaction between an acid and a base that produces salt and water. The acid and base cancel each other out, making the solution neutral.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">Why does toothpaste taste slightly bitter?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Toothpaste contains mild bases that neutralise the acids produced by bacteria in your mouth. Bases taste bitter — which is why toothpaste has that characteristic flavour.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What happens when an ant stings you?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">When an ant stings, it injects formic acid (methanoic acid) into the skin, which causes the burning sensation. To relieve it, apply a mild base like baking soda solution to neutralise the acid.</p>
  </details>
</div>
`
  },
  {
    title: "Important Questions on Acids, Bases and Salts | Class 7 CBSE Science",
    slug: "important-questions-on-acids-bases-and-salts-class-7",
    category: "acid-bases",
    excerpt: "Hoshi's exam strategy: cover every question type before you walk into the hall. This post has all the important questions from Acids, Bases and Salts.",
    tags: ["Class 7 Science", "CBSE", "Acids Bases and Salts", "Important Questions"],
    image: "",
    content: `
<p>Hoshi's exam strategy: cover every question type before you walk into the hall. This post has all the important questions from Acids, Bases and Salts — fill in the blanks, true/false, 1-mark, 2-mark, 3-mark, MCQs, and application questions. Work through these before your exam and you'll be ready for anything.</p>

<div style="background-color: #fefce8; padding: 1rem; border: 1px solid #fef08a; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <p style="margin: 0; color: #854d0e;">📌 <strong>How to use this page:</strong> Try to answer each question yourself before reading the answer. This active recall method helps you remember much better than just reading notes.</p>
</div>

<h2>Fill in the Blanks (1 mark each)</h2>
<ul>
  <li>Substances that taste sour are called <strong>Acids</strong>.</li>
  <li>Substances that taste bitter and feel soapy are called <strong>Bases</strong>.</li>
  <li>Blue litmus turns <strong>Red</strong> in the presence of an acid.</li>
  <li>Red litmus turns <strong>Blue</strong> in the presence of a base.</li>
  <li>Litmus is extracted from <strong>Lichens</strong>.</li>
  <li>Turmeric turns <strong>Red</strong> in the presence of a base.</li>
  <li>The reaction between an acid and a base is called <strong>Neutralisation</strong>.</li>
  <li>Acid + Base → <strong>Salt</strong> + <strong>Water</strong>.</li>
  <li>The acid present in lemon juice is <strong>Citric</strong> acid.</li>
</ul>

<h2>True or False (1 mark each)</h2>
<ul>
  <li><strong>All acids are harmful and dangerous.</strong><br/><em>False. Many acids are safe and found in food.</em></li>
  <li><strong>Turmeric changes colour in acidic solutions.</strong><br/><em>False. Turmeric shows no colour change in acidic solutions. It only changes colour (turns red) in basic solutions.</em></li>
  <li><strong>Neutralisation produces salt and water.</strong><br/><em>True. Acid + Base → Salt + Water.</em></li>
  <li><strong>Baking soda is an acid.</strong><br/><em>False. Baking soda (sodium bicarbonate) is a base.</em></li>
  <li><strong>A neutral solution changes the colour of both blue and red litmus paper.</strong><br/><em>False. A neutral solution does not change the colour of either.</em></li>
</ul>

<h2>1-Mark Questions</h2>
<p><strong>Q: What is an acid?</strong><br/>A: An acid is a substance that tastes sour and turns blue litmus paper red.</p>
<p><strong>Q: What is neutralisation?</strong><br/>A: Neutralisation is the reaction between an acid and a base to produce salt and water.</p>

<h2>Application-Based Questions</h2>
<p><strong>Q: Myra's mother accidentally spilled some acidic liquid on the kitchen floor. What should Myra use to clean it safely? Explain why.</strong><br/>A: Myra should use a base — such as baking soda dissolved in water — to clean the acidic spill. The base will neutralise the acid through a neutralisation reaction, forming a harmless salt and water.</p>
<p><strong>Q: Hoshi noticed that the soil in his garden was too acidic and plants were not growing well. What would you advise him to do?</strong><br/>A: Hoshi should add lime (calcium hydroxide — a base) to the soil. Lime will neutralise the excess acid in the soil, making it better for plant growth.</p>

<hr style="margin: 2rem 0; border: 0; border-top: 1px solid #e5e7eb;" />

<h2>Frequently Asked Questions</h2>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What are the most important topics from Acids, Bases and Salts for Class 7?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">The most important topics are: (1) definitions of acids, bases, and salts, (2) properties and examples of each, (3) indicators — litmus, turmeric, China rose and their colour changes, (4) neutralisation reaction and its equation, and (5) real-life applications of neutralisation.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is the equation for neutralisation?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Acid + Base → Salt + Water. This is the general neutralisation equation. Example: Hydrochloric acid + Sodium hydroxide → Sodium chloride + Water.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">Name three natural indicators and their colour changes.</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">1. Litmus: Blue litmus → red in acid; Red litmus → blue in base. 2. Turmeric: No change in acid; turns red in base. 3. China rose: Dark pink/magenta in acid; green in base.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">Why is lime added to acidic soil?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Lime (calcium hydroxide) is a base. When added to acidic soil, it neutralises the excess acid through a neutralisation reaction. This makes the soil suitable for crop growth.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is the difference between baking soda and washing soda?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Baking soda is sodium bicarbonate — used in cooking and as an antacid. Washing soda is sodium carbonate — used for cleaning. Both are bases, but washing soda is more strongly basic.</p>
  </details>
</div>
`
  },
  {
    title: "Indicators in Science: Litmus, Turmeric, China Rose | Class 7 CBSE",
    slug: "indicators-in-science-litmus-turmeric-china-rose-class-7",
    category: "acid-bases",
    excerpt: "Babloo found something strange: his yellow turmeric stain turned red when soap touched it. This post explains every indicator you need to know for Class 7 CBSE.",
    tags: ["Class 7 Science", "CBSE", "Acids Bases and Salts", "Indicators"],
    image: "",
    content: `
<p>Babloo found something strange: his yellow turmeric stain turned red when soap touched it. And when he dipped a blue strip into lemon juice — it turned red too. Both are indicators doing their job — changing colour to reveal whether something is an acid or a base. This post explains every indicator you need to know for Class 7 CBSE.</p>

<h2>What Is an Indicator?</h2>
<div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <div style="font-size: 0.875rem; font-weight: bold; color: #2563eb; margin-bottom: 0.5rem; text-transform: uppercase;">Definition — write this in your exam</div>
  <p style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e3a8a;">An indicator is a substance that changes colour in the presence of an acid or a base, and is used to identify whether a substance is acidic, basic, or neutral.</p>
</div>
<p>Indicators are important because many acids and bases are dangerous to taste or touch directly. Instead of tasting a chemical, we use an indicator to test it safely. The colour change tells us everything we need to know.</p>

<h2>Litmus — The Most Important Indicator</h2>
<p>Litmus is a natural dye extracted from lichens. It is purple in its natural form but is used in two versions for testing:</p>
<ul>
  <li><strong>Blue litmus paper:</strong> In Acid → Turns RED | In base → stays blue</li>
  <li><strong>Red litmus paper:</strong> In Base → Turns BLUE | In acid → stays red</li>
</ul>

<h2>Turmeric Indicator</h2>
<p>Turmeric (haldi) is a yellow spice found in every Indian kitchen — and it is also a natural indicator.</p>
<ul>
  <li><strong>In acidic solutions:</strong> No colour change (stays yellow)</li>
  <li><strong>In basic solutions:</strong> Turns red</li>
  <li><strong>In neutral solutions:</strong> No colour change</li>
</ul>

<h2>China Rose (Hibiscus) Indicator</h2>
<p>China rose can be used to make a natural indicator solution by soaking the petals in water.</p>
<ul>
  <li><strong>In acidic solutions:</strong> Turns dark pink / magenta</li>
  <li><strong>In basic solutions:</strong> Turns green</li>
  <li><strong>In neutral solutions:</strong> No change (stays pink)</li>
</ul>

<hr style="margin: 2rem 0; border: 0; border-top: 1px solid #e5e7eb;" />

<h2>Frequently Asked Questions</h2>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is an indicator in science?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">An indicator is a substance that changes colour in the presence of an acid or a base. It helps identify whether a substance is acidic, basic, or neutral without tasting it. Common indicators include litmus, turmeric, and China rose.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is litmus and where is it obtained from?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Litmus is a natural dye extracted from lichens. It is the most commonly used indicator. Blue litmus turns red in acids; red litmus turns blue in bases.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What colour does turmeric turn in a base?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Turmeric turns red in basic solutions. It shows no colour change in acidic or neutral solutions — it stays yellow. This is why a turmeric stain on fabric turns red when washed with soap.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What colour does China rose indicator turn in acid and base?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">China rose indicator turns dark pink or magenta in acidic solutions and turns green in basic solutions. In neutral solutions, it stays pink.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">Why do we use indicators instead of tasting a substance?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Many acids and bases are dangerous or harmful if swallowed or even touched. Indicators allow us to test whether a substance is acidic or basic safely, just by observing a colour change.</p>
  </details>
</div>
`
  },
  {
    title: "What Are Acids, Bases and Salts? Easy Explanation for Class 7",
    slug: "what-are-acids-bases-and-salts-easy-explanation-class-7",
    category: "acid-bases",
    excerpt: "Hoshi's kitchen is full of acids and bases — and he had no idea. This post explains what acids, bases, and salts actually are — simply, clearly, with examples you already know.",
    tags: ["Class 7 Science", "CBSE", "Acids Bases and Salts", "Explanation"],
    image: "",
    content: `
<p>Hoshi's kitchen is full of acids and bases — and he had no idea. The lemon? Acid. The baking soda? Base. The salt in his food? Formed when an acid met a base. This post explains what acids, bases, and salts actually are — simply, clearly, with examples you already know.</p>

<h2>What Is an Acid?</h2>
<div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <div style="font-size: 0.875rem; font-weight: bold; color: #2563eb; margin-bottom: 0.5rem; text-transform: uppercase;">Definition — write this in your exam</div>
  <p style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e3a8a;">An acid is a substance that tastes sour and turns blue litmus paper red.</p>
</div>
<p>Think of the sharpest flavour you know — lemon, tamarind, vinegar. That sourness is caused by acids present in those substances.</p>

<h2>What Is a Base?</h2>
<div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <div style="font-size: 0.875rem; font-weight: bold; color: #2563eb; margin-bottom: 0.5rem; text-transform: uppercase;">Definition — write this in your exam</div>
  <p style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e3a8a;">A base is a substance that tastes bitter, feels soapy or slippery, and turns red litmus paper blue.</p>
</div>
<p>Bases are the opposite of acids. The bitterness of bitter gourd (karela), the feel of soap between your fingers, the slippery texture of baking soda solution — all of these are properties of bases.</p>

<h2>What Is a Salt?</h2>
<p>A salt is a substance formed when an acid reacts with a base. This reaction is called neutralisation. The most familiar salt is common table salt — sodium chloride (NaCl). It forms when hydrochloric acid (HCl) reacts with sodium hydroxide (NaOH).</p>

<h2>How to Identify Acids and Bases</h2>
<p>We use indicators to identify acids and bases safely — without tasting unknown substances.</p>
<ul>
  <li><strong>Blue litmus:</strong> Turns red in acid, no change in base</li>
  <li><strong>Red litmus:</strong> No change in acid, turns blue in base</li>
  <li><strong>Turmeric:</strong> No change in acid, turns red in base</li>
  <li><strong>China rose:</strong> Dark pink in acid, green in base</li>
</ul>

<hr style="margin: 2rem 0; border: 0; border-top: 1px solid #e5e7eb;" />

<h2>Frequently Asked Questions</h2>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is an acid in Class 7 science?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">An acid is a substance that tastes sour and turns blue litmus paper red. Examples: lemon juice (citric acid), vinegar (acetic acid), tamarind (tartaric acid), curd (lactic acid), ant sting (formic acid).</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is a base in Class 7 science?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">A base is a substance that tastes bitter, feels soapy or slippery, and turns red litmus paper blue. Examples: baking soda (sodium bicarbonate), soap, lime water (calcium hydroxide), washing soda (sodium carbonate).</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">What is a salt in science?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">A salt is a substance formed when an acid reacts with a base in a neutralisation reaction. The most common example is common table salt — sodium chloride (NaCl).</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">Is lemon juice an acid or a base?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Lemon juice is an acid. It contains citric acid, which gives it its sour taste. If you test lemon juice with blue litmus paper, it turns red — confirming it is acidic.</p>
  </details>
</div>
<div style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
  <details>
    <summary style="font-weight: 600; cursor: pointer; outline: none; font-size: 1.125rem; color: #1f2937;">Is baking soda an acid or a base?</summary>
    <p style="margin-top: 0.5rem; color: #4b5563;">Baking soda (sodium bicarbonate) is a base. It tastes slightly bitter, feels slightly soapy, and turns red litmus paper blue. It is commonly used to neutralise acids.</p>
  </details>
</div>
`
  }
];

async function insertBlogs() {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected successfully!');

    let count = 0;
    for (const blogData of blogs) {
      const existing = await Blog.findOne({ slug: blogData.slug });
      
      if (existing) {
        console.log(`Updating existing blog: ${blogData.title}`);
        await Blog.updateOne({ _id: existing._id }, { $set: blogData });
      } else {
        console.log(`Inserting new blog: ${blogData.title}`);
        const blog = new Blog(blogData);
        await blog.save();
      }
      count++;
    }

    console.log(`✅ Successfully processed ${count} acid-base blogs!`);
    mongoose.connection.close();
  } catch (error) {
    console.error('Error inserting blogs:', error);
    mongoose.connection.close();
  }
}

insertBlogs();
