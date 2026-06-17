import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Blog from './models/Blog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const title = "Normal Human Body Temperature: 37°C and 98.6°F Explained | Class 6";
const excerpt = "Why is normal human body temperature 37°C or 98.6°F? CBSE Class 6 Science explanation — what normal means, what fever is, how it's measured, and exam-ready answers.";
const tags = ["Class 6 Science", "CBSE", "Temperature"];

const htmlContent = `
<h2>What Is the Normal Human Body Temperature?</h2>
<div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-bottom: 1.5rem; border-radius: 0.5rem;">
  <div style="font-size: 0.875rem; font-weight: bold; color: #2563eb; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Most asked question in this chapter — write this exactly</div>
  <p style="margin: 0; font-size: 1.125rem; font-weight: 600; color: #1e3a8a;">The normal temperature of the human body is <em>37°C</em> or <em>98.6°F</em>.</p>
</div>
<p>This is one of the most frequently tested facts in Class 6 Science exams — it appears as a fill-in-the-blank, a one-mark question, or as part of a longer answer about thermometers. Write both values: <strong>37°C</strong> and <strong>98.6°F</strong>.</p>

<h2>37°C and 98.6°F — Understanding Both Values</h2>
<p>The same temperature is written differently on the two scales:</p>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌡️</div>
    <div style="font-weight: bold; color: #475569; margin-bottom: 0.5rem;">Celsius scale</div>
    <div style="font-size: 2rem; font-weight: 800; color: #0f172a;">37°C</div>
    <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.5rem;">used in India &amp; science</div>
  </div>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌡️</div>
    <div style="font-weight: bold; color: #475569; margin-bottom: 0.5rem;">Fahrenheit scale</div>
    <div style="font-size: 2rem; font-weight: 800; color: #0f172a;">98.6°F</div>
    <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.5rem;">marked on clinical thermometers</div>
  </div>
</div>

<p>Both values mean the same temperature — just expressed in different units. In India and in CBSE exams, <strong>37°C is the primary value</strong> to remember. But 98.6°F is also tested, especially as a fill-in-the-blank.</p>
<div style="background-color: #fefce8; padding: 1rem; border: 1px solid #fef08a; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <p style="margin: 0; color: #854d0e;">💡 <strong>Memory tip:</strong> 37°C · 98.6°F · Normal body. Write this line three times and you'll never forget it.</p>
</div>

<h2>What Is Fever?</h2>
<p>Fever is when the body temperature rises <strong>above its normal value of 37°C</strong>. A temperature of <strong>38°C or above</strong> is generally considered a fever and may indicate that the body is fighting an infection.</p>

<div style="overflow-x: auto; margin-bottom: 1.5rem;">
  <table style="width: 100%; border-collapse: collapse; text-align: left;">
    <thead>
      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
        <th style="padding: 0.75rem;">Temperature (°C)</th>
        <th style="padding: 0.75rem;">What It Means</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>35°C–36.5°C</strong></td>
        <td style="padding: 0.75rem;">Below normal (possible hypothermia if very low)</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>36.5°C–37.5°C</strong></td>
        <td style="padding: 0.75rem; color: #16a34a; font-weight: bold;">Normal range</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>37.5°C–38°C</strong></td>
        <td style="padding: 0.75rem;">Slightly elevated — possible early fever</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 0.75rem;"><strong>38°C–40°C</strong></td>
        <td style="padding: 0.75rem; color: #ca8a04; font-weight: bold;">Fever — medical attention may be needed</td>
      </tr>
      <tr>
        <td style="padding: 0.75rem;"><strong>Above 40°C</strong></td>
        <td style="padding: 0.75rem; color: #dc2626; font-weight: bold;">High fever — seek immediate medical attention</td>
      </tr>
    </tbody>
  </table>
</div>

<div style="background-color: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <div style="font-weight: bold; color: #16a34a; margin-bottom: 0.5rem;">✅ Exam-ready answer</div>
  <p style="margin: 0 0 0.5rem 0;"><strong>Q: When does a person have a fever?</strong></p>
  <p style="margin: 0; color: #14532d;">A: A person is said to have a fever when their body temperature rises above the normal value of 37°C (98.6°F). A temperature of 38°C or above usually indicates fever.</p>
</div>

<h2>Why Does the Body Maintain a Constant Temperature?</h2>
<p>The human body is designed to keep its temperature close to 37°C at all times. This is because most of the chemical processes inside the body — especially those involving enzymes — work best at this temperature.</p>
<p>When you are ill, your body may raise its temperature deliberately as part of fighting infection. This is what we call fever — it is the body's own defence response, not just a symptom.</p>

<div style="background-color: #fefce8; padding: 1rem; border: 1px solid #fef08a; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <p style="margin: 0; color: #854d0e;">💡 This concept — that the body maintains a constant internal temperature — is called <strong>thermoregulation</strong>. You don't need to use this word in Class 6, but understanding the idea helps you answer "why" questions.</p>
</div>

<h2>Why Is the Clinical Thermometer Range 35°C to 42°C?</h2>
<p>A clinical thermometer has a range of <strong>35°C to 42°C</strong>. This range is deliberately chosen because:</p>
<ul>
  <li><strong>35°C</strong> is the lower boundary — a human body temperature below this would indicate a serious medical emergency (hypothermia)</li>
  <li><strong>42°C</strong> is the upper boundary — a human body temperature above this is extremely dangerous and requires immediate emergency care</li>
</ul>
<p>The range is narrow and precise — which is exactly what is needed for detecting small temperature differences that indicate illness. This is why a laboratory thermometer (range −10°C to 110°C) is not suitable for this purpose.</p>

<div style="background-color: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <div style="font-weight: bold; color: #16a34a; margin-bottom: 0.5rem;">✅ Exam-ready answer</div>
  <p style="margin: 0 0 0.5rem 0;"><strong>Q: Why is the range of a clinical thermometer 35°C to 42°C?</strong></p>
  <p style="margin: 0; color: #14532d;">A: The range of a clinical thermometer is 35°C to 42°C because this covers the complete range of possible human body temperatures — from dangerously low (35°C) to dangerously high fever (42°C). A normal body temperature of 37°C falls well within this range.</p>
</div>

<h2>How Body Temperature Is Measured</h2>
<p>Body temperature is measured using a <strong>clinical thermometer</strong>. Here is the correct procedure:</p>
<ol>
  <li>Wash the thermometer with cold water and antiseptic solution.</li>
  <li>Jerk the thermometer downward several times to bring mercury below 35°C.</li>
  <li>Place the bulb of the thermometer under the tongue and keep the mouth closed. (It can also be placed in the armpit.)</li>
  <li>Wait for 1–2 minutes without removing the thermometer.</li>
  <li>Remove and hold horizontally at eye level to read the mercury level.</li>
  <li>Record the reading. Wash the thermometer again before storing.</li>
</ol>

<div style="background-color: #fef2f2; padding: 1rem; border: 1px solid #fecaca; border-radius: 0.5rem; margin-bottom: 1.5rem;">
  <div style="font-weight: bold; color: #dc2626; margin-bottom: 0.5rem;">⚠️ Common mistake</div>
  <p style="margin: 0 0 0.5rem 0; color: #991b1b;"><strong>Never use a laboratory thermometer to measure body temperature.</strong></p>
  <p style="margin: 0; color: #991b1b;">A laboratory thermometer has no kink — the mercury falls back the moment you remove it from the mouth. You cannot get an accurate reading. Only use a clinical thermometer for body temperature.</p>
</div>

<h2>Other Reference Temperatures to Know</h2>
<div style="background: #f8fafc; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #e2e8f0;">
  <h3 style="margin-top: 0; color: #0f172a;">Key temperatures — CBSE Class 6</h3>
  <ul style="list-style-type: none; padding: 0; margin: 0;">
    <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #818cf8;"></span> <span>Water freezes</span></div>
      <div style="font-weight: bold;">0°C <span style="color: #64748b; font-weight: normal; margin-left: 0.5rem;">(32°F)</span></div>
    </li>
    <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #10b981;"></span> <span>Normal human body temperature</span></div>
      <div style="font-weight: bold;">37°C <span style="color: #64748b; font-weight: normal; margin-left: 0.5rem;">(98.6°F)</span></div>
    </li>
    <li style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #f59e0b;"></span> <span>Fever threshold</span></div>
      <div style="font-weight: bold;">38°C+ <span style="color: #64748b; font-weight: normal; margin-left: 0.5rem;">(100.4°F+)</span></div>
    </li>
    <li style="padding: 0.5rem 0; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ef4444;"></span> <span>Water boils</span></div>
      <div style="font-weight: bold;">100°C <span style="color: #64748b; font-weight: normal; margin-left: 0.5rem;">(212°F)</span></div>
    </li>
  </ul>
</div>

<h2>Exam-Ready Answers</h2>
<div style="background-color: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1rem;">
  <div style="font-weight: bold; color: #16a34a; margin-bottom: 0.5rem;">✅ Fill in the blank</div>
  <p style="margin: 0 0 0.5rem 0;"><strong>Q: The normal temperature of the human body is ______.</strong></p>
  <p style="margin: 0; color: #14532d;">A: 37°C or 98.6°F</p>
</div>
<div style="background-color: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1rem;">
  <div style="font-weight: bold; color: #16a34a; margin-bottom: 0.5rem;">✅ 2-mark answer</div>
  <p style="margin: 0 0 0.5rem 0;"><strong>Q: What is the normal temperature of the human body? What does it mean if the temperature is above this?</strong></p>
  <p style="margin: 0; color: #14532d;">A: The normal temperature of the human body is 37°C or 98.6°F. If the body temperature rises above 37°C — typically to 38°C or higher — it is called fever. Fever usually indicates that the body is fighting an infection or illness.</p>
</div>
<div style="background-color: #f0fdf4; padding: 1rem; border: 1px solid #bbf7d0; border-radius: 0.5rem; margin-bottom: 1rem;">
  <div style="font-weight: bold; color: #16a34a; margin-bottom: 0.5rem;">✅ 1-mark answer</div>
  <p style="margin: 0 0 0.5rem 0;"><strong>Q: What is the upper limit of a clinical thermometer and why?</strong></p>
  <p style="margin: 0; color: #14532d;">A: The upper limit of a clinical thermometer is 42°C. This is because a human body temperature above 42°C is extremely dangerous and would require emergency medical care — so no higher range is needed.</p>
</div>

<hr style="margin: 2rem 0; border: none; border-top: 1px solid #e2e8f0;">

<h2>Frequently Asked Questions</h2>
<div style="margin-bottom: 1.5rem;">
  <p><strong>What is the normal temperature of the human body?</strong><br>
  The normal temperature of the human body is 37°C or 98.6°F.</p>
  
  <p><strong>What temperature is considered fever?</strong><br>
  A temperature above 37°C is generally considered elevated. A reading of 38°C or above is typically considered a fever and may indicate that the body is fighting an infection.</p>
  
  <p><strong>Which thermometer is used to measure body temperature?</strong><br>
  A clinical thermometer is used to measure body temperature. Its range is 35°C to 42°C, which covers all possible human body temperatures from dangerously low to dangerously high.</p>
  
  <p><strong>Why is the range of a clinical thermometer 35°C to 42°C?</strong><br>
  This range is chosen because it covers the complete spectrum of human body temperatures. 35°C marks dangerously low body temperature (hypothermia), and 42°C marks dangerously high fever. Normal body temperature (37°C) falls comfortably in the middle.</p>
  
  <p><strong>Why does the body maintain a constant temperature?</strong><br>
  The body maintains a constant temperature of around 37°C because this is the optimum temperature for the body's biological and chemical processes to function correctly. When you are ill, this temperature may rise (fever) as the body responds to infection.</p>
  
  <p><strong>Is 37°C and 98.6°F the same temperature?</strong><br>
  Yes. 37°C and 98.6°F are the same temperature — just expressed in different units. Celsius and Fahrenheit are two different scales for measuring temperature. In India, Celsius is the standard scale used.</p>
</div>
`;

async function upload() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if it already exists to avoid duplicates
    const existing = await Blog.findOne({ title });
    if (existing) {
      existing.content = htmlContent;
      existing.excerpt = excerpt;
      existing.tags = tags;
      existing.image = 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1779867323/img-to-link/wslwzocccttlxjc6ixjo.png';
      await existing.save();
      console.log('✅ Blog updated successfully');
    } else {
      const newBlog = new Blog({
        title,
        excerpt,
        content: htmlContent,
        author: 'Hoshiyaar',
        tags,
        image: 'https://res.cloudinary.com/dcxlzfyfp/image/upload/v1779867323/img-to-link/wslwzocccttlxjc6ixjo.png'
      });
      await newBlog.save();
      console.log('✅ New blog created successfully');
    }
    
  } catch (err) {
    console.error('Error uploading blog:', err);
  } finally {
    mongoose.disconnect();
  }
}

upload();
