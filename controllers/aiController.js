import axios from 'axios';
import AiExamSession from '../models/AiExamSession.js';
import SystemSettings from '../models/SystemSettings.js';
import User from '../models/User.js';
import { getWeekMonday, DEFAULT_EXAM_CONFIG } from './aiAnalyticsController.js';

export const evaluateDescriptiveAnswer = async (req, res) => {
  try {
    const { question, userAnswer, expectedAnswer, subjectKnowledge, userId, chapterId, chapterTitle, subject } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'Question and User Answer are required.' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'AI API Key is not configured.' });
    }

    // Prepare prompt
    const prompt = `You are an expert, encouraging teacher evaluating a student's answer in a school exam.
${subjectKnowledge ? `Context / Subject Knowledge: "${subjectKnowledge}"` : ''}
Question: "${question}"
Student's Answer: "${userAnswer}"
${expectedAnswer ? `Expected Idea / Model Answer: "${expectedAnswer}"` : ''}

Evaluate the student's answer thoroughly against the expected idea/syllabus.
Return a STRICT JSON object with NO markdown blocks, newlines inside strings, or trailing commas.
Format exactly:
{
  "right": "Highlight specific accurate points, facts, or concepts the student correctly mentioned. If completely blank or wrong, state: 'No correct points identified in this answer.'",
  "wrong": "Highlight specific inaccuracies, misconceptions, or incomplete statements. If the student's answer is accurate, state: 'No conceptual errors found.'",
  "missing": "Detail the essential concepts, scientific keywords, or reasoning from the model answer that were omitted and should be learned. Always provide helpful learning points.",
  "grammar": "Provide constructive advice on grammar, sentence clarity, spelling, or scientific phrasing. If grammar is great, give a tip on advanced phrasing or presentation.",
  "score": 85,
  "isCorrect": true
}
Note: 'score' must be an integer (0 to 100). Set 'isCorrect' to true if score >= 70, false otherwise. Never leave 'missing', 'wrong', or 'grammar' as null or empty.`;

    // Call Gemini API using axios with retry logic for 503 errors
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest'
    ];

    let response;
    let lastError = null;

    for (const modelName of candidateModels) {
      let retries = 2;
      while (retries > 0) {
        try {
          response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
            {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.2,
                maxOutputTokens: 2000
              }
            },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 15000
            }
          );
          if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[AI Eval Single] Model ${modelName} failed with status ${err.response?.status || err.message}, retrying...`);
          retries--;
          if (retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
          }
        }
      }
      if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        break;
      }
    }

    const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const usage = response.data?.usageMetadata || {};
    
    if (!textOutput) {
      throw new Error("Invalid response from AI API");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(textOutput);
    } catch (e) {
      try {
        let jsonString = textOutput.trim();
        const start = jsonString.indexOf('{');
        let end = jsonString.lastIndexOf('}');
        
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

    // Ensure non-null feedback fields
    if (!parsedResult.missing || parsedResult.missing === 'null') {
      parsedResult.missing = expectedAnswer ? `Review these key points: ${expectedAnswer}` : "Review core chapter concepts for completeness.";
    }
    if (!parsedResult.wrong || parsedResult.wrong === 'null') {
      parsedResult.wrong = parsedResult.isCorrect ? "No major conceptual errors found." : "Explanation needs more precision.";
    }
    if (!parsedResult.grammar || parsedResult.grammar === 'null') {
      parsedResult.grammar = "Express thoughts in clear, structured sentences with relevant terms.";
    }

    return res.json({
      ...parsedResult,
      aiEvaluated: true
    });

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
    const { 
      items, 
      subjectKnowledge, 
      userId, 
      chapterId, 
      chapterTitle, 
      subject, 
      timeSpentSeconds = 0 
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'An array of items is required.' });
    }

    // Check weekly attempt limits if userId & chapterId provided
    if (userId && chapterId && mongoose.Types.ObjectId.isValid(userId)) {
      const setting = await SystemSettings.findOne({ key: 'exam_attempt_config' });
      const config = setting?.value || DEFAULT_EXAM_CONFIG;

      if (config.enabled) {
        const user = await User.findById(userId).select('role phone username name school');
        const cleanPhone = String(user?.phone || '').replace(/\D/g, '');
        const isAdmin = user?.role === 'admin' ||
          ['9867735936', '7021970672', '9820277252'].some(p => cleanPhone.endsWith(p)) ||
          ['Host', 'hostcbse', 'AKSHITRAVULA', 'AKSHIT', 'SB10', 'Nidhi sekhri'].includes(user?.username);

        if (!isAdmin) {
          const currentWeekStart = getWeekMonday();
          const weekSessions = await AiExamSession.find({
            userId,
            weekStart: currentWeekStart,
            status: 'completed'
          }).select('chapterId');

          const distinctChapters = Array.from(new Set(weekSessions.map(s => String(s.chapterId))));
          const isNewChapter = !distinctChapters.includes(String(chapterId));
          const maxChapters = Number(config.maxChaptersPerWeek || 3);
          const maxAttemptsPerChapter = Number(config.maxAttemptsPerChapterPerWeek || 3);

          if (isNewChapter && distinctChapters.length >= maxChapters) {
            return res.status(403).json({
              error: config.exhaustedMessage || DEFAULT_EXAM_CONFIG.exhaustedMessage,
              exhausted: true
            });
          }

          const chapterAttemptsUsed = weekSessions.filter(s => String(s.chapterId) === String(chapterId)).length;
          if (chapterAttemptsUsed >= maxAttemptsPerChapter) {
            return res.status(403).json({
              error: config.chapterExhaustedMessage || DEFAULT_EXAM_CONFIG.chapterExhaustedMessage,
              exhausted: true
            });
          }
        }
      }
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'AI API Key is not configured.' });
    }

    let promptContext = items.map((item) => `
Item ID: ${item.id}
Question: "${item.question}"
Student's Answer: "${item.userAnswer}"
${item.expectedAnswer ? `Expected Idea / Model Answer: "${item.expectedAnswer}"` : ''}
---`).join('\n');

    const prompt = `You are an expert, encouraging teacher evaluating answers from a student in a school exam.
${subjectKnowledge ? `Context / Subject Knowledge: "${subjectKnowledge}"` : ''}
Below are questions along with the student's answers and model answers.

${promptContext}

Evaluate each answer thoroughly. Return a STRICT JSON array of objects with NO markdown formatting, backticks, or trailing commas.
Format exactly:
[
  {
    "id": "match the Item ID",
    "right": "Highlight specific accurate points, facts, or concepts the student correctly mentioned. If blank/wrong, state: 'No correct points identified in this answer.'",
    "wrong": "Highlight specific inaccuracies, misconceptions, or incomplete statements. If accurate, state: 'No conceptual errors found.'",
    "missing": "Detail essential concepts, scientific keywords, or reasoning from the model answer that were omitted. Always provide helpful learning points.",
    "grammar": "Provide constructive advice on grammar, clarity, spelling, or scientific phrasing. Never return null.",
    "score": 85,
    "isCorrect": true
  }
]
Note: 'score' must be an integer (0 to 100). Set 'isCorrect' to true if score >= 70, false otherwise. Never leave 'missing', 'wrong', or 'grammar' as null or empty.`;

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest'
    ];

    let response;
    let lastError = null;

    for (const modelName of candidateModels) {
      let retries = 2;
      while (retries > 0) {
        try {
          response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
            {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: "application/json", temperature: 0.2, maxOutputTokens: 4096 }
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
          );
          if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[AI Eval] Model ${modelName} failed with status ${err.response?.status || err.message}, retrying...`);
          retries--;
          if (retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
          }
        }
      }
      if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        break;
      }
    }

    if (!response && lastError) {
      console.error('[AI Eval] All candidate models failed, creating heuristic evaluation fallback...');
    }

    const textOutput = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const usage = response?.data?.usageMetadata || {};

    let parsedResult = [];
    if (textOutput) {
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
          try {
            parsedResult = JSON.parse(jsonString);
          } catch (innerErr) {
            console.warn('Fallback JSON parsing failed, checking individual objects...');
          }
        }
      }
    } else {
      console.warn('[AI Eval] No textOutput received from AI API, generating fallback evaluation.');
    }

    if (!Array.isArray(parsedResult)) {
      parsedResult = [];
    }

    // Ensure all items have a result, filling fallback if missing
    items.forEach((item, idx) => {
      let r = parsedResult.find(resItem => {
        if (!resItem) return false;
        if (String(resItem.id) === String(item.id)) return true;
        const c1 = String(resItem.id).replace(/\D/g, '');
        const c2 = String(item.id).replace(/\D/g, '');
        return Boolean(c1 && c2 && c1 === c2);
      });

      if (r) {
        r.id = item.id;
      } else if (parsedResult[idx] && !items.some((it, otherIdx) => otherIdx !== idx && String(parsedResult[idx].id) === String(it.id))) {
        r = parsedResult[idx];
        r.id = item.id;
      }

      const hasAnswer = item.userAnswer && item.userAnswer.trim() && item.userAnswer.trim().toLowerCase() !== 'no answer submitted';
      
      if (!r) {
        r = {
          id: item.id,
          right: hasAnswer ? "Answer submitted." : "No answer was submitted for this question.",
          wrong: hasAnswer ? "Incomplete or inaccurate explanation." : "Question was left unanswered.",
          missing: item.expectedAnswer ? `Expected key concepts: ${item.expectedAnswer}` : "Core conceptual points from the lesson.",
          grammar: hasAnswer ? "Express thoughts clearly with relevant subject terminology." : "N/A (No answer submitted)",
          score: hasAnswer ? 35 : 0,
          isCorrect: false,
          aiEvaluated: false
        };
        parsedResult.push(r);
      } else {
        r.aiEvaluated = true;
        // Sanitize any nulls returned by AI
        if (!r.right || r.right === 'null') {
          r.right = r.isCorrect ? "Answer covers key relevant points." : "No distinct correct points identified.";
        }
        if (!r.wrong || r.wrong === 'null') {
          r.wrong = r.isCorrect ? "No major conceptual errors found." : (item.expectedAnswer ? `Review expected concept: ${item.expectedAnswer}` : "Explanation needs more detail.");
        }
        if (!r.missing || r.missing === 'null') {
          r.missing = item.expectedAnswer ? `Key points to remember: ${item.expectedAnswer}` : "Detailed reasoning and supporting examples.";
        }
        if (!r.grammar || r.grammar === 'null') {
          r.grammar = "Use precise scientific terms and clear sentence structure.";
        }
      }
    });

    // Log complete session into AiExamSession
    try {
      const promptTokens = Number(usage.promptTokenCount || 0);
      const completionTokens = Number(usage.candidatesTokenCount || 0);
      const totalTokens = Number(usage.totalTokenCount || (promptTokens + completionTokens));
      // 1 credit per question evaluated or minimum 1
      const aiCreditsUsed = Math.max(1, items.length);

      let userInfo = {};
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const u = await User.findById(userId).select('name username phone school');
        if (u) {
          userInfo = {
            name: u.name || '',
            username: u.username || '',
            phone: u.phone || '',
            school: u.school || ''
          };
        }
      }

      let evaluatedQuestions = [];
      if (req.body.allQuestions && Array.isArray(req.body.allQuestions) && req.body.allQuestions.length > 0) {
        evaluatedQuestions = req.body.allQuestions.map(q => {
          if (q.type === 'mcq') {
            const isCorrect = q.userAnswer && q.userAnswer === q.expectedAnswer;
            return {
              id: String(q.id),
              question: q.question,
              userAnswer: q.userAnswer || '',
              expectedAnswer: q.expectedAnswer || '',
              right: isCorrect ? `Correct option selected: "${q.expectedAnswer}"` : 'Option selected was incorrect.',
              wrong: isCorrect ? 'No errors.' : (q.expectedAnswer ? `The correct answer was: "${q.expectedAnswer}"` : 'Incorrect option chosen.'),
              missing: isCorrect ? 'None' : (q.expectedAnswer ? `Key answer: "${q.expectedAnswer}"` : 'Correct option'),
              grammar: 'N/A (Multiple Choice Question)',
              score: isCorrect ? 100 : 0,
              isCorrect: Boolean(isCorrect)
            };
          } else {
            const fb = parsedResult.find(r => {
              if (!r) return false;
              if (String(r.id) === String(q.id)) return true;
              const c1 = String(r.id).replace(/\D/g, '');
              const c2 = String(q.id).replace(/\D/g, '');
              return Boolean(c1 && c2 && c1 === c2);
            }) || {};
            return {
              id: String(q.id),
              question: q.question,
              userAnswer: q.userAnswer || '',
              expectedAnswer: q.expectedAnswer || '',
              right: fb.right || 'Points covered in answer.',
              wrong: fb.wrong || 'Conceptual gaps.',
              missing: fb.missing || (q.expectedAnswer ? `Expected: ${q.expectedAnswer}` : 'Missing details.'),
              grammar: fb.grammar || 'Check phrasing and terminology.',
              score: fb.score !== undefined ? Number(fb.score) : 0,
              isCorrect: Boolean(fb.isCorrect)
            };
          }
        });
      } else {
        evaluatedQuestions = items.map(item => {
          const fb = parsedResult.find(r => {
            if (!r) return false;
            if (String(r.id) === String(item.id)) return true;
            const c1 = String(r.id).replace(/\D/g, '');
            const c2 = String(item.id).replace(/\D/g, '');
            return Boolean(c1 && c2 && c1 === c2);
          }) || {};
          return {
            id: String(item.id),
            question: item.question,
            userAnswer: item.userAnswer || '',
            expectedAnswer: item.expectedAnswer || '',
            right: fb.right || null,
            wrong: fb.wrong || null,
            missing: fb.missing || null,
            grammar: fb.grammar || null,
            score: Number(fb.score || 0),
            isCorrect: Boolean(fb.isCorrect)
          };
        });
      }

      const totalScoreSum = evaluatedQuestions.reduce((acc, q) => acc + (q.score || 0), 0);
      const avgScore = req.body.overallScore !== undefined 
        ? Number(req.body.overallScore) 
        : (evaluatedQuestions.length > 0 ? Math.round(totalScoreSum / evaluatedQuestions.length) : 0);

      const currentWeekStart = getWeekMonday();
      let attemptNumber = 1;
      if (userId && chapterId) {
        const prevCount = await AiExamSession.countDocuments({
          userId,
          chapterId: String(chapterId),
          weekStart: currentWeekStart
        });
        attemptNumber = prevCount + 1;
      }

      await AiExamSession.create({
        userId: userId || null,
        userInfo,
        chapterId: String(chapterId || 'unknown'),
        chapterTitle: chapterTitle || '',
        subject: subject || subjectKnowledge || 'Science',
        weekStart: currentWeekStart,
        attemptNumber,
        questions: evaluatedQuestions,
        finalScore: avgScore,
        timeSpentSeconds: Number(timeSpentSeconds || 0),
        aiCreditsUsed,
        promptTokens,
        completionTokens,
        totalTokens,
        status: 'completed'
      });
    } catch (logErr) {
      console.warn('Failed to log AI Exam Session:', logErr.message);
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`,
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
