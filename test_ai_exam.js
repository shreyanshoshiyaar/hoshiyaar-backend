import { config } from 'dotenv';
import axios from 'axios';

config();

async function testExamAI() {
  const subjectKnowledge = `Subject: Science – Acids, Bases and Salts (Class 7/NCERT)
Scope: Evaluate answers only for Questions 2–6 based on the NCERT chapter "Acids, Bases and Salts." The AI should check:

Scientific accuracy of the concepts.
Whether all key points required by the textbook are covered.
Missing or incorrect information.
Grammar, spelling, and sentence structure.
Clarity and completeness of the answer.

Expected Concepts:
Q2: Lichens grow well in areas with clean, unpolluted air and are indicators of air pollution.
Q3: Natural indicators such as turmeric, red cabbage juice, china rose (hibiscus) extract, etc., can be used instead of litmus.
Q4: Onion, vanilla, and clove are examples of olfactory indicators whose smell changes in acidic/basic media.
Q5: Common remedies for ant bites include applying baking soda paste, calamine lotion, or other mild alkaline substances to neutralize the formic acid injected by ants.
Q6: Acidic factory waste should be neutralized (e.g., with lime/slaked lime) before being released into water bodies to protect aquatic life.`;

  const items = [
    {
      id: "q1",
      index: 0,
      question: "Do you find lichens on trees in your neighbourhood?",
      expectedAnswer: "Lichens grow well in areas with clean, unpolluted air and are indicators of air pollution.",
      userAnswer: "Yes, because the air is clean here."
    },
    {
      id: "q2",
      index: 1,
      question: "If litmus is not available, are there some other natural substances that can serve as acid-base indicators?",
      expectedAnswer: "Natural indicators such as turmeric, red cabbage juice, china rose (hibiscus) extract, etc., can be used instead of litmus.",
      userAnswer: "We can use turmeric."
    }
  ];

  try {
    console.log("Testing AI Evaluation Endpoint...");
    const response = await axios.post('http://localhost:5000/api/ai/evaluate-batch', {
      items,
      subjectKnowledge
    });
    
    console.log("✅ Evaluation Results:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Error during evaluation:");
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testExamAI();
