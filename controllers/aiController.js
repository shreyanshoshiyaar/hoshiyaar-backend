import axios from 'axios';

export const evaluateDescriptiveAnswer = async (req, res) => {
  try {
    const { question, userAnswer, expectedAnswer, subjectKnowledge } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'Question and User Answer are required.' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'AI API Key is not configured.' });
    }

    // Prepare prompt
    const prompt = `You are a strict but encouraging teacher evaluating a student's answer.
${subjectKnowledge ? `Context / Subject Knowledge: "${subjectKnowledge}"` : ''}
Question: "${question}"
Student's Answer: "${userAnswer}"
${expectedAnswer ? `Expected Idea/Answer: "${expectedAnswer}"` : ''}

Evaluate the student's answer. Return a STRICT JSON object. Do not include markdown blocks, newlines, or unescaped quotes inside the values. Ensure the output can be parsed by JSON.parse().
Format:
{
  "right": "What the student got right (or null if completely wrong).",
  "wrong": "What the student got wrong or is incomplete (or null if perfect).",
  "missing": "What important concepts are missing from the answer (or null).",
  "grammar": "Any grammar or syntax corrections (or null if grammar is fine).",
  "score": 85, // Integer from 0 to 100 representing how complete and accurate the answer is
  "isCorrect": true or false
}`;

    // Call Gemini API using axios with retry logic for 503 errors
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.2,
              maxOutputTokens: 1000
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        break; // Success, exit loop
      } catch (err) {
        if (err.response?.status === 503 && retries > 1) {
          retries--;
          console.warn(`Gemini API 503 error. Retrying... (${retries} attempts left)`);
          await new Promise(res => setTimeout(res, 2000)); // Wait 2 seconds
        } else {
          throw err; // Throw if not 503 or out of retries
        }
      }
    }

    const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textOutput) {
      throw new Error("Invalid response from AI API");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(textOutput);
    } catch (e) {
      try {
        let jsonString = textOutput.trim();
        // Fallback: extract substring between first { and last }
        const start = jsonString.indexOf('{');
        let end = jsonString.lastIndexOf('}');
        
        // If it got truncated and there's no closing brace
        if (start !== -1 && end === -1) {
          jsonString = jsonString + '\n}';
          end = jsonString.lastIndexOf('}');
        }

        if (start !== -1 && end !== -1) {
          jsonString = jsonString.substring(start, end + 1);
          parsedResult = JSON.parse(jsonString);
        } else {
          throw new Error("No JSON object found in response");
        }
      } catch (innerError) {
        throw new Error(`Failed to parse AI JSON: ${innerError.message}. Raw output: ${textOutput}`);
      }
    }

    return res.json(parsedResult);

  } catch (error) {
    const aiErrorMessage = error?.response?.data?.error?.message;
    console.error('Error evaluating AI answer:', aiErrorMessage || error.message);
    
    if (error?.response?.status === 429) {
      return res.status(429).json({ error: 'AI Rate Limit Exceeded. Please wait a minute and try again.' });
    }
    if (error?.response?.status === 503) {
      return res.status(503).json({ error: 'AI Servers are temporarily overloaded. Please try again later.' });
    }
    
    res.status(500).json({ error: aiErrorMessage || 'Failed to evaluate answer using AI.' });
  }
};

export const evaluateBatchAnswers = async (req, res) => {
  try {
    const { items, subjectKnowledge } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'An array of items is required.' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'AI API Key is not configured.' });
    }

    let promptContext = items.map((item, index) => `
Item ID: ${item.id}
Question: "${item.question}"
Student's Answer: "${item.userAnswer}"
${item.expectedAnswer ? `Expected Idea: "${item.expectedAnswer}"` : ''}
---`).join('\n');

    const prompt = `You are a strict but encouraging teacher evaluating multiple answers from a student.
${subjectKnowledge ? `Context / Subject Knowledge: "${subjectKnowledge}"` : ''}
Below are several questions along with the student's answers.

${promptContext}

Evaluate each answer. Return a STRICT JSON array of objects. Do not include markdown blocks, newlines, or unescaped quotes inside the values. Ensure the output can be parsed by JSON.parse().
Format exactly like this example array:
[
  {
    "id": "match the Item ID",
    "right": "What the student got right (or null if completely wrong).",
    "wrong": "What the student got wrong or is incomplete (or null if perfect).",
    "missing": "What important concepts are missing from the answer (or null).",
    "grammar": "Any grammar or syntax corrections (or null if grammar is fine).",
    "score": 85,
    "isCorrect": true
  }
]`;

    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json", temperature: 0.2, maxOutputTokens: 2000 }
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        break;
      } catch (err) {
        if (err.response?.status === 503 && retries > 1) {
          retries--;
          await new Promise(res => setTimeout(res, 2000));
        } else {
          throw err;
        }
      }
    }

    const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) throw new Error("Invalid response from AI API");

    let parsedResult;
    try {
      parsedResult = JSON.parse(textOutput);
    } catch (e) {
      let jsonString = textOutput.trim();
      const start = jsonString.indexOf('[');
      let end = jsonString.lastIndexOf(']');
      if (start !== -1 && end === -1) {
        jsonString = jsonString + '\n]';
        end = jsonString.lastIndexOf(']');
      }
      if (start !== -1 && end !== -1) {
        jsonString = jsonString.substring(start, end + 1);
        parsedResult = JSON.parse(jsonString);
      } else {
        throw new Error("No JSON array found in response");
      }
    }
    return res.json(parsedResult);
  } catch (error) {
    const aiErrorMessage = error?.response?.data?.error?.message;
    console.error('Error evaluating batch AI answer:', aiErrorMessage || error.message);
    if (error?.response?.status === 429) return res.status(429).json({ error: 'AI Rate Limit Exceeded.' });
    if (error?.response?.status === 503) return res.status(503).json({ error: 'AI Servers are overloaded.' });
    res.status(500).json({ error: aiErrorMessage || 'Failed to evaluate batch answers.' });
  }
};

export const handleFollowup = async (req, res) => {
  try {
    const { question, userAnswer, action, doubtText } = req.body;

    if (!question || !action) {
      return res.status(400).json({ error: 'Question and action are required.' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'AI API Key is not configured.' });
    }

    let instruction = "";
    if (action === 'simply') {
      instruction = "Explain the correct answer to this question as simply as possible for a young student. Keep it short and encouraging.";
    } else if (action === 'hinglish') {
      instruction = "Explain the correct answer to this question using conversational Hinglish (a natural mix of Hindi and English words like a friendly Indian teacher). Keep it short and encouraging.";
    } else if (action === 'doubt') {
      if (!doubtText) return res.status(400).json({ error: 'Doubt text is required for doubt action.' });
      instruction = `The student has a specific doubt: "${doubtText}". Answer this doubt clearly and simply, directly relating it to the question.`;
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const prompt = `You are a strict but encouraging teacher.
Question: "${question}"
Student's Original Answer (for context): "${userAnswer || ''}"

Instruction: ${instruction}

Answer the student directly. Do NOT use markdown code blocks or JSON. Just reply with the plain text explanation.`;

    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 800
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        break;
      } catch (err) {
        if (err.response?.status === 503 && retries > 1) {
          retries--;
          await new Promise(res => setTimeout(res, 2000));
        } else {
          throw err;
        }
      }
    }

    const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textOutput) {
      throw new Error("Invalid response from AI API");
    }

    return res.json({ message: textOutput.trim() });

  } catch (error) {
    const aiErrorMessage = error?.response?.data?.error?.message;
    console.error('Error handling follow-up:', aiErrorMessage || error.message);
    
    if (error?.response?.status === 429) {
      return res.status(429).json({ error: 'AI Rate Limit Exceeded. Please wait a minute and try again.' });
    }
    if (error?.response?.status === 503) {
      return res.status(503).json({ error: 'AI Servers are temporarily overloaded. Please try again later.' });
    }
    
    res.status(500).json({ error: aiErrorMessage || 'Failed to generate follow-up using AI.' });
  }
};
