import { db } from '../db/database';

/**
 * AI Service for LifeOS Companion
 * Handles Gemini API interaction with fallback mechanisms.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Fetches the API key from database settings.
 */
async function getApiKey() {
  const setting = await db.settings.get('geminiApiKey');
  const enabled = await db.settings.get('aiEnabled');
  if (enabled?.value === false) return null;
  return setting?.value || null;
}

/**
 * Generic wrapper to call Gemini API.
 * 
 * @param {string} prompt - The text prompt to send.
 * @param {Object} options - Additional options (e.g., response schema).
 * @returns {Promise<string|null>} - The AI response or null if failed/rate-limited.
 */
export async function askGemini(prompt, options = {}) {
  const apiKey = await getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: options.generationConfig || {
          temperature: 0.1,
          topP: 0.8,
          topK: 40,
        }
      })
    });

    if (response.status === 429) {
      console.warn('Gemini API Rate Limit hit. Falling back to manual mode.');
      return null;
    }

    if (!response.ok) {
      console.error('Gemini API Error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('AI Service Error:', error);
    return null;
  }
}

/**
 * Specific helper for parsing transaction text into JSON.
 */
export async function parseTransactionWithAI(text) {
  const prompt = `
    Extract transaction details from the following text into a JSON object.
    Text: "${text}"
    
    Format:
    {
      "amount": number,
      "description": "merchant or purpose",
      "category": "Food/Transport/Shopping/Dining/Utilities/Health/Entertainment/Other",
      "date": "YYYY-MM-DD"
    }
    
    Strictly return ONLY the JSON object. If a field is missing, use null.
  `;

  const responseText = await askGemini(prompt);
  if (!responseText) return null;

  try {
    // Basic cleanup in case AI adds markdown blocks
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', responseText);
    return null;
  }
}

/**
 * Specific helper for task prioritization.
 */
export async function prioritizeTasksWithAI(tasks) {
  const taskSummary = tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Due: ${t.dueDate || 'none'}, Postponed: ${t.postponeCount}x)`).join('\n');
  const prompt = `
    Rank the following tasks for today and pick the Top 3. 
    Give a one-sentence reason for each choice.
    
    Tasks:
    ${taskSummary}
    
    Return the response in this format:
    1. Task Name: Reason
    2. Task Name: Reason
    3. Task Name: Reason
  `;

  return await askGemini(prompt);
}
