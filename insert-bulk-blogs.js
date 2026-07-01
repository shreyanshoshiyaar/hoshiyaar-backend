import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Blog from './models/Blog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const blogs = [
  {
    title: "Temperature and Its Measurement Class 6 Notes | CBSE Science",
    slug: "temperature-and-its-measurement-class-6-notes",
    category: "temperature",
    excerpt: "Hoshi noticed something strange: a steel spoon and a wooden spoon were sitting in the same room, but the steel one felt much hotter to touch. Why? This is your complete CBSE guide to Temperature and Its Measurement.",
    tags: ["Class 6 Science", "CBSE", "Temperature", "Notes"],
    image: "", // You can update the image in the admin panel
    content: `
<p>Hoshi noticed something strange: a steel spoon and a wooden spoon were sitting in the same room, but the steel one felt much hotter to touch. Same room. Same surroundings. Why? The answer lies in understanding temperature — what it is, how we measure it, and why it matters. This is your complete CBSE guide to this chapter.</p>

<h2>What Is Temperature?</h2>
<div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <div style="font-size: 0.875rem; font-weight: bold; color: #2563eb; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">CBSE Definition — write this in your exam</div>
  <p style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e3a8a;">Temperature is the measure of the degree of hotness or coldness of an object or substance.</p>
</div>
<p>When you touch a cup of hot tea, your hand feels warm. When you hold an ice cube, your hand feels cold. This difference in feeling is because the tea and the ice have different temperatures. A higher temperature means an object is hotter; a lower temperature means it is cooler.</p>
<p>Temperature is measured using an instrument called a thermometer.</p>
<div style="background-color: #fefce8; padding: 1rem; border: 1px solid #fef08a; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <p style="margin: 0; color: #854d0e;">💡 <strong>Remember:</strong> Temperature and heat are not the same thing. Temperature is a measurement. Heat is a form of energy. We cover this important difference below.</p>
</div>

<h2>What Is a Thermometer?</h2>
<p>A thermometer is an instrument used to measure temperature. Most thermometers contain mercury — a silvery liquid metal that expands when heated and contracts when cooled. As mercury moves up or down a thin glass tube, we can read the temperature from the scale marked on the tube.</p>
<p>There are two types of thermometers you need to know for Class 6 CBSE:</p>
<ul>
  <li><strong>Clinical thermometer</strong> — used to measure human body temperature</li>
  <li><strong>Laboratory thermometer</strong> — used to measure temperature in science experiments</li>
</ul>

<h2>Clinical Thermometer</h2>
<p>A clinical thermometer is the thermometer a doctor or nurse uses to check if you have a fever. It is designed specifically for measuring the temperature of the human body.</p>
<h3>Key features:</h3>
<ul>
  <li><strong>Range:</strong> 35°C to 42°C (or 94°F to 108°F) — covers the full range of human body temperatures including high fever</li>
  <li><strong>Has a kink:</strong> a small bend just above the bulb. This prevents mercury from falling back when removed from the mouth, so the reading stays visible</li>
  <li><strong>Must be jerked before use:</strong> shake the thermometer downward a few times before each reading to bring mercury below 35°C</li>
  <li>Placed under the tongue or armpit to take a reading</li>
</ul>

<div style="background-color: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <div style="font-weight: bold; color: #16a34a; margin-bottom: 0.5rem;">✅ Exam-ready answer</div>
  <p style="margin: 0 0 0.5rem 0; font-weight: 600;">Q: What is the use of a kink in a clinical thermometer?</p>
  <p style="margin: 0; color: #14532d;">A: The kink in a clinical thermometer prevents mercury from flowing back into the bulb after the thermometer is removed from the patient's mouth. This allows the temperature reading to remain visible even after removal.</p>
</div>

<h3>How to use a clinical thermometer:</h3>
<ol>
  <li>Wash the thermometer with cold water and wipe clean with antiseptic.</li>
  <li>Jerk it downward to bring mercury below 35°C.</li>
  <li>Place it under the tongue (or in the armpit) and keep the mouth closed.</li>
  <li>Wait for 1–2 minutes, then remove it.</li>
  <li>Read the temperature at eye level, holding it horizontally.</li>
</ol>

<h2>Laboratory Thermometer</h2>
<p>A laboratory thermometer is used to measure temperature in science experiments — for example, to measure the temperature of water being heated, or a cooling liquid in a beaker.</p>
<h3>Key features:</h3>
<ul>
  <li><strong>Range:</strong> −10°C to 110°C — a much wider range than a clinical thermometer</li>
  <li><strong>No kink:</strong> mercury falls back as soon as it is removed from the substance, so you must read it while it is still submerged</li>
  <li><strong>Never used for body temperature:</strong> it is not designed for this purpose</li>
  <li>Must be held upright while reading</li>
  <li>The bulb must be fully submerged in the substance being measured</li>
</ul>

<div style="background-color: #fef2f2; padding: 1rem; border-left: 4px solid #ef4444; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <div style="font-size: 0.875rem; font-weight: bold; color: #dc2626; margin-bottom: 0.5rem; text-transform: uppercase;">⚠️ Common mistake</div>
  <p style="margin: 0; color: #991b1b;">Never use a laboratory thermometer to measure human body temperature. Its range goes up to 110°C — far too high for body use, and its design makes an accurate body-temperature reading impossible. Always use a clinical thermometer for the human body.</p>
</div>

<h2>Clinical vs Laboratory Thermometer — Comparison Table</h2>
<p>This table is one of the most frequently asked topics in Class 6 Science exams. Know it well.</p>
<div style="overflow-x: auto; margin-bottom: 1.5rem;">
  <table style="width: 100%; border-collapse: collapse; text-align: left;">
    <thead>
      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 0.75rem;">Feature</th>
        <th style="padding: 0.75rem;">Clinical Thermometer</th>
        <th style="padding: 0.75rem;">Laboratory Thermometer</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Used for</strong></td>
        <td style="padding: 0.75rem;">Measuring human body temperature</td>
        <td style="padding: 0.75rem;">Measuring temperature in experiments</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Range</strong></td>
        <td style="padding: 0.75rem;">35°C to 42°C</td>
        <td style="padding: 0.75rem;">−10°C to 110°C</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Kink</strong></td>
        <td style="padding: 0.75rem;">Yes — prevents mercury falling back</td>
        <td style="padding: 0.75rem;">No kink</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Reading</strong></td>
        <td style="padding: 0.75rem;">Can be read after removing from mouth</td>
        <td style="padding: 0.75rem;">Must be read while still in the substance</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>Jerking before use</strong></td>
        <td style="padding: 0.75rem;">Yes, required before every use</td>
        <td style="padding: 0.75rem;">Not needed</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>Temperature Scales: Celsius and Fahrenheit</h2>
<p>Temperature is measured using two scales. You need to know both for CBSE Class 6.</p>
<h3>Celsius (°C)</h3>
<p>The Celsius scale is used in India and in science. Key values:</p>
<ul>
  <li>Water freezes at 0°C</li>
  <li>Normal human body temperature: 37°C</li>
  <li>Water boils at 100°C</li>
</ul>
<h3>Fahrenheit (°F)</h3>
<p>The Fahrenheit scale appears on clinical thermometers alongside Celsius. Key values:</p>
<ul>
  <li>Water freezes at 32°F</li>
  <li>Normal human body temperature: 98.6°F</li>
  <li>Water boils at 212°F</li>
</ul>

<h2>Heat vs Temperature — The Key Difference</h2>
<p>This is one of the most common points of confusion — and one of the most common exam questions.</p>
<div style="overflow-x: auto; margin-bottom: 1.5rem;">
  <table style="width: 100%; border-collapse: collapse; text-align: left;">
    <thead>
      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 0.75rem;">Heat</th>
        <th style="padding: 0.75rem;">Temperature</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">A form of energy</td>
        <td style="padding: 0.75rem;">A measurement</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">Flows from hot to cold objects</td>
        <td style="padding: 0.75rem;">Tells us how hot or cold an object is</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">Measured in Joules (J) or Calories</td>
        <td style="padding: 0.75rem;">Measured in °C or °F</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;">A large pot of lukewarm water contains more heat than a small cup of boiling water</td>
        <td style="padding: 0.75rem;">The boiling water has a higher temperature</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>Safety Rules When Using a Thermometer</h2>
<p>These appear as short-answer questions in CBSE exams. Know at least three:</p>
<ul>
  <li>Never hold a thermometer by the bulb — always hold by the upper end</li>
  <li>Never wash a thermometer with hot water — it may break or give a wrong reading</li>
  <li>Do not tilt a laboratory thermometer while reading — keep it upright</li>
  <li>Read the thermometer at eye level to avoid parallax error</li>
  <li>Keep the bulb of a laboratory thermometer fully submerged while measuring</li>
  <li>Do not use a laboratory thermometer to measure body temperature</li>
</ul>`
  },
  {
    title: "Important Questions on Temperature and Its Measurement | Class 6 CBSE",
    slug: "important-questions-class-6",
    category: "temperature",
    excerpt: "Work through these important questions from Temperature and Its Measurement — fill in the blanks, 1-mark, 2-mark, 3-mark, true/false, and MCQs before your exam.",
    tags: ["Class 6 Science", "CBSE", "Important Questions", "Temperature"],
    image: "", // You can update the image in the admin panel
    content: `
<p>Hoshi's rule before any exam: "Read the chapter once, then answer every question type you might face." This post covers every important question from Temperature and Its Measurement — fill in the blanks, 1-mark, 2-mark, 3-mark, true/false, and MCQs. Work through these before your test and you're ready.</p>

<div style="background-color: #fefce8; padding: 1rem; border: 1px solid #fef08a; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <p style="margin: 0; color: #854d0e;">📌 <strong>How to use this page:</strong> Read each question first and try to answer it yourself. Then reveal the answer. This active recall method is much more effective than just reading.</p>
</div>

<h2>Fill in the Blanks (1 mark each)</h2>
<ul>
  <li>The normal temperature of the human body is <strong>37°C or 98.6°F</strong>.</li>
  <li>Temperature is measured using an instrument called a <strong>thermometer</strong>.</li>
  <li>The range of a clinical thermometer is <strong>35°C to 42°C</strong>.</li>
  <li>The range of a laboratory thermometer is <strong>−10°C to 110°C</strong>.</li>
  <li>Water boils at <strong>100°C</strong> and freezes at <strong>0°C</strong>.</li>
  <li>The small bend near the bulb of a clinical thermometer is called a <strong>kink</strong>.</li>
  <li>Temperature is measured in degrees <strong>Celsius (°C)</strong> or degrees <strong>Fahrenheit (°F)</strong>.</li>
  <li>A clinical thermometer is <strong>jerked</strong> before each use to bring the mercury below 35°C.</li>
</ul>

<h2>True or False (1 mark each)</h2>
<ul>
  <li><strong>A laboratory thermometer can be used to measure body temperature.</strong><br/><em>False. A laboratory thermometer has no kink and is not designed for body temperature measurement. Only a clinical thermometer should be used.</em></li>
  <li><strong>Heat and temperature are the same thing.</strong><br/><em>False. Heat is a form of energy. Temperature is a measure of how hot or cold something is. They are different concepts.</em></li>
  <li><strong>The kink in a clinical thermometer prevents mercury from falling back into the bulb after removal.</strong><br/><em>True.</em></li>
  <li><strong>A thermometer should be held by the bulb while reading.</strong><br/><em>False. A thermometer should always be held by the upper end — never by the bulb. Holding the bulb transfers body heat to the thermometer and gives an incorrect reading.</em></li>
  <li><strong>Water freezes at 0°C and boils at 100°C.</strong><br/><em>True.</em></li>
  <li><strong>A laboratory thermometer must be read while the bulb is still inside the liquid.</strong><br/><em>True. Because there is no kink, mercury falls back as soon as the thermometer is removed.</em></li>
</ul>

<h2>1-Mark Questions</h2>
<p><strong>Q: What is temperature?</strong><br/>
A: Temperature is the measure of the degree of hotness or coldness of an object or substance.</p>
<p><strong>Q: Name the instrument used to measure temperature.</strong><br/>
A: A thermometer is used to measure temperature.</p>
<p><strong>Q: What is the unit of temperature?</strong><br/>
A: Temperature is measured in degrees Celsius (°C) or degrees Fahrenheit (°F).</p>
<p><strong>Q: Which thermometer is used to measure human body temperature?</strong><br/>
A: A clinical thermometer is used to measure human body temperature.</p>
<p><strong>Q: What is the use of a kink in a clinical thermometer?</strong><br/>
A: The kink prevents mercury from flowing back into the bulb after the thermometer is removed from the patient's mouth, keeping the reading stable.</p>

<h2>2-Mark Questions</h2>
<p><strong>Q: What is the normal temperature of the human body? What does it mean if the temperature is above this?</strong><br/>
A: The normal temperature of the human body is 37°C or 98.6°F. If the body temperature rises above 37°C — typically to 38°C or higher — it is called fever. Fever usually means the body is fighting an infection.</p>
<p><strong>Q: State two differences between a clinical and a laboratory thermometer.</strong><br/>
A: 1. A clinical thermometer has a range of 35°C to 42°C, while a laboratory thermometer has a range of −10°C to 110°C.<br/>
2. A clinical thermometer has a kink that prevents mercury from falling back. A laboratory thermometer has no kink, so it must be read while still in the substance.</p>
<p><strong>Q: What is the difference between heat and temperature?</strong><br/>
A: Heat is a form of energy that flows from a hotter body to a cooler one. Temperature is the measure of the degree of hotness or coldness of a body. Heat is measured in Joules; temperature is measured in degrees Celsius (°C) or Fahrenheit (°F).</p>
<p><strong>Q: Why should a thermometer not be washed with hot water?</strong><br/>
A: A thermometer should not be washed with hot water because the hot water would heat the mercury and cause it to expand rapidly, which could break the glass tube. Always wash a thermometer with cold water.</p>

<h2>3-Mark Questions</h2>
<p><strong>Q: Differentiate between a clinical thermometer and a laboratory thermometer on the basis of: (a) use, (b) range, (c) presence of a kink.</strong><br/>
A:<br/>
(a) <strong>Use:</strong> A clinical thermometer is used to measure the temperature of the human body. A laboratory thermometer is used to measure temperature in science experiments.<br/>
(b) <strong>Range:</strong> A clinical thermometer has a range of 35°C to 42°C. A laboratory thermometer has a range of −10°C to 110°C.<br/>
(c) <strong>Kink:</strong> A clinical thermometer has a kink just above the bulb that prevents mercury from falling back after removal. A laboratory thermometer has no kink, so it must be read while still in the substance.</p>

<p><strong>Q: Write the steps for correctly using a clinical thermometer to measure a patient's temperature.</strong><br/>
A:<br/>
1. Wash the thermometer with cold water and wipe clean with antiseptic solution.<br/>
2. Jerk the thermometer downward to bring mercury below 35°C.<br/>
3. Place the bulb under the patient's tongue and ask them to keep their mouth closed.<br/>
4. Wait for 1–2 minutes without removing the thermometer.<br/>
5. Remove the thermometer and hold it horizontally at eye level to read the mercury level.<br/>
6. Record the temperature, then wash and store the thermometer safely.</p>
`
  },
  {
    title: "What Is Temperature? Easy Explanation for Class 6",
    slug: "what-is-temperature-class-6",
    category: "temperature",
    excerpt: "Simple explanation of temperature for Class 6 CBSE students — definition, examples, measurement, and difference from heat.",
    tags: ["Class 6 Science", "CBSE", "Temperature"],
    image: "", // You can update the image in the admin panel
    content: `
  <!-- DEFINITION -->
  <h2 id="definition">Definition of Temperature</h2>

  <div class="definition-block">
    <div class="def-label">CBSE Definition</div>
    <p class="def-text">Temperature is the measure of the <span>degree of hotness or coldness</span> of an object or substance.</p>
  </div>

  <p>
    When you hold a cup of hot tea, your hand feels warm. When you pick up an ice cube, your hand feels cold. The difference in what you feel is because the tea and the ice have different <strong>temperatures</strong>.
  </p>
  <p>
    A higher temperature means an object is <strong>hotter</strong>. A lower temperature means it is <strong>cooler</strong>. Temperature tells us <em>how hot or cold something is</em> — nothing more, nothing less.
  </p>
  <p>
    Temperature is measured using an instrument called a <strong>thermometer</strong>.
  </p>

  <!-- EXAMPLES -->
  <h2 id="examples">Real-Life Examples of Temperature</h2>
  <p>Here are temperatures of common things you already know — these make for great exam answers too:</p>

  <div class="example-grid">
    <div class="eg-card">
      <div class="eg-emoji">🧊</div>
      <div class="eg-title">Ice / Freezing water</div>
      <div class="eg-temp">0°C</div>
      <div class="eg-label">32°F</div>
    </div>
    <div class="eg-card">
      <div class="eg-emoji">🧍</div>
      <div class="eg-title">Human body</div>
      <div class="eg-temp">37°C</div>
      <div class="eg-label">98.6°F (normal)</div>
    </div>
    <div class="eg-card">
      <div class="eg-emoji">☕</div>
      <div class="eg-title">Hot tea / coffee</div>
      <div class="eg-temp">~60–70°C</div>
      <div class="eg-label">comfortable to sip</div>
    </div>
    <div class="eg-card">
      <div class="eg-emoji">💧</div>
      <div class="eg-title">Boiling water</div>
      <div class="eg-temp">100°C</div>
      <div class="eg-label">212°F</div>
    </div>
  </div>

  <div class="note-box">
    <p>💡 <strong>Hoshi's tip:</strong> The human body temperature card (37°C = 98.6°F) appears in almost every Class 6 Science exam. Write it down once, memorise it.</p>
  </div>

  <!-- UNIT -->
  <h2 id="unit">Unit of Temperature</h2>
  <p>Temperature is measured in <strong>degrees</strong>. There are two scales used in Class 6:</p>
  <ul>
    <li><strong>Celsius (°C)</strong> — used in India, in science, and on most thermometers</li>
    <li><strong>Fahrenheit (°F)</strong> — used in some countries, and also shown on clinical thermometers</li>
  </ul>
  <p>The symbol <strong>°</strong> stands for "degrees." So 37°C is read as "thirty-seven degrees Celsius."</p>

  <!-- SCALE -->
  <h2 id="scale">Important Temperature Values to Know</h2>

  <div class="temp-scale">
    <div class="scale-title">Reference temperatures — CBSE Class 6</div>
    <div class="scale-row">
      <div class="scale-dot" style="background:#a78bfa"></div>
      <div class="scale-event">Water freezes (ice forms)</div>
      <div class="scale-c">0°C</div>
      <div class="scale-f">32°F</div>
    </div>
    <div class="scale-row">
      <div class="scale-dot" style="background:#34d399"></div>
      <div class="scale-event">Normal human body temperature</div>
      <div class="scale-c">37°C</div>
      <div class="scale-f">98.6°F</div>
    </div>
    <div class="scale-row">
      <div class="scale-dot" style="background:#f59e0b"></div>
      <div class="scale-event">High fever threshold</div>
      <div class="scale-c">~40°C</div>
      <div class="scale-f">104°F</div>
    </div>
    <div class="scale-row">
      <div class="scale-dot" style="background:#f87171"></div>
      <div class="scale-event">Water boils</div>
      <div class="scale-c">100°C</div>
      <div class="scale-f">212°F</div>
    </div>
  </div>

  <!-- HOW MEASURED -->
  <h2 id="how-measured">How Is Temperature Measured?</h2>
  <p>
    Temperature is measured using an instrument called a <strong>thermometer</strong>. Most thermometers contain <strong>mercury</strong> — a silvery liquid that expands when heated and contracts when cooled. As it moves up or down a thin glass tube, we can read the temperature.
  </p>
  <p>There are two types of thermometers you need to know for Class 6:</p>
  <ul>
    <li><strong>Clinical thermometer</strong> — used to measure body temperature (range: 35°C to 42°C). Has a kink near the bulb.</li>
    <li><strong>Laboratory thermometer</strong> — used to measure temperature in experiments (range: −10°C to 110°C). No kink.</li>
  </ul>
  <p>
    👉 Full comparison in our post: <a href="https://hoshiyaar.info/temperature-measurement-class-6" style="color:var(--teal);font-weight:600;">Temperature and Its Measurement — Complete Class 6 Notes</a>
  </p>

  <!-- HEAT VS TEMP -->
  <h2 id="heat-vs-temp">Heat vs Temperature — The Key Difference</h2>
  <p>Students often mix up heat and temperature. Here is the clear difference:</p>

  <div class="comp-table-wrap">
    <table>
      <thead>
        <tr><th>Heat</th><th>Temperature</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>A form of energy</td>
          <td>A measurement</td>
        </tr>
        <tr>
          <td>Flows from hot to cold objects</td>
          <td>Tells us how hot or cold an object is</td>
        </tr>
        <tr>
          <td>Measured in Joules (J)</td>
          <td>Measured in °C or °F</td>
        </tr>
        <tr>
          <td>A large bucket of warm water has more heat than a small cup of boiling water</td>
          <td>The boiling water has a higher temperature</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="mistake-box">
    <div class="mistake-box-label">⚠️ Common mistake</div>
    <p><strong>"Heat and temperature mean the same thing."</strong> — This is wrong.</p>
    <p>Heat is a form of energy. Temperature is how we measure hotness or coldness. If your exam asks "what is temperature?", the answer is not "it is heat." The answer is: "Temperature is the measure of the degree of hotness or coldness of an object."</p>
    <p>Always use the word <em>measure</em> or <em>degree of hotness/coldness</em> in your definition.</p>
  </div>

  <!-- EXAM READY -->
  <h2 id="exam-ready">Exam-Ready Answers</h2>

  <div class="exam-box">
    <div class="exam-box-label">✅ Write exactly this in your exam</div>
    <p><strong>Q: What is temperature?</strong></p>
    <p>A: Temperature is the measure of the degree of hotness or coldness of an object or substance. It is measured using a thermometer in degrees Celsius (°C) or Fahrenheit (°F).</p>
  </div>

  <div class="exam-box">
    <div class="exam-box-label">✅ One-mark answer</div>
    <p><strong>Q: What is the unit of temperature?</strong></p>
    <p>A: Temperature is measured in degrees Celsius (°C) or degrees Fahrenheit (°F).</p>
  </div>

  <div class="exam-box">
    <div class="exam-box-label">✅ Fill in the blank</div>
    <p><strong>Q: The normal temperature of the human body is ______.</strong></p>
    <p>A: 37°C or 98.6°F</p>
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

    console.log(`✅ Successfully processed ${count} blogs!`);
    mongoose.connection.close();
  } catch (error) {
    console.error('Error inserting blogs:', error);
    mongoose.connection.close();
  }
}

insertBlogs();
