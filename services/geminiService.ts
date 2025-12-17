import { GoogleGenAI, Type, Schema } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing!");
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to strip markdown code blocks if present
const cleanAndParseJson = (text: string) => {
  try {
    // Replace ```json ... ``` or just ``` ... ```
    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Original Text:", text);
    // Attempt to extract array or object if mixed with text
    const arrayMatch = text.match(/\[.*\]/s);
    if (arrayMatch) {
        try { return JSON.parse(arrayMatch[0]); } catch (e2) {}
    }
    const objectMatch = text.match(/\{.*\}/s);
    if (objectMatch) {
        try { return JSON.parse(objectMatch[0]); } catch (e2) {}
    }
    throw e;
  }
};

/**
 * Generates supporting arguments for a specific stance on a topic.
 */
export const generateArguments = async (topic: string, stance: string): Promise<string[]> => {
  const ai = getAiClient();
  
  const prompt = `
    This is for a Chinese debate game.
    The topic of a playful dispute is: "${topic}".
    A user's stance is: "${stance}".
    Generate 12 short, punchy, colloquial CHINESE arguments (max 12 Chinese characters each) that support this stance.
    They should sound like spoken language in a chat or a funny argument (e.g., "这明明就是我的理！", "根本不是那样").
    Return strictly a JSON array of strings in Simplified Chinese.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return ["AI在思考中..."];
    return cleanAndParseJson(text) as string[];
  } catch (error) {
    console.error("GenAI Error:", error);
    return ["网络开小差了", "正在憋大招...", "这很有道理", "看情况吧", "这可不好说"];
  }
};

/**
 * Simulates a debate round between two arguments.
 */
export const simulateBattleRound = async (
  topic: string, 
  arg1: string, 
  p1Name: string, 
  arg2: string, 
  p2Name: string,
  isP1Manual: boolean,
  isP2Manual: boolean
): Promise<{ dialogue: { speaker: string; text: string }[], voteP1: number, reason: string }> => {
  const ai = getAiClient();

  const prompt = `
    Context: A fun, informal debate application called "都来评评理" (Judge for Us).
    Language: Simplified Chinese (Mandarin).
    Topic: "${topic}"
    
    Player 1 (${p1Name}) MUST argue using this reason: "${arg1}"
    Player 2 (${p2Name}) MUST argue using this reason: "${arg2}"
    
    Task 1: Generate a short dialogue (WeChat style, short sentences).
    - START IMMEDIATELY with the debate.
    - Player 1 uses their argument "${arg1}" to attack or claim superiority.
    - Player 2 uses their argument "${arg2}" to retort or defend.
    - 2 to 4 turns total.
    - Casual, slang-friendly, aggressive but funny.
    - Speaker names must strictly be "${p1Name}" and "${p2Name}".
    
    Task 2: Act as an impartial AI Judge. 
    - Decide who wins this specific exchange based on logic and wit of the provided reasons.
    - Assign a score for Player 1 (0-100). >50 means P1 wins, <50 means P2 wins.
    - Provide a 1-sentence reason for the verdict in Chinese (max 20 chars).
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      dialogue: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speaker: { type: Type.STRING },
            text: { type: Type.STRING }
          }
        }
      },
      voteP1: { type: Type.INTEGER },
      reason: { type: Type.STRING }
    },
    required: ["dialogue", "voteP1", "reason"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return cleanAndParseJson(text);
  } catch (error) {
    console.error("Battle Error", error);
    return {
      dialogue: [
        { speaker: p1Name, text: arg1 },
        { speaker: p2Name, text: arg2 }
      ],
      voteP1: 50,
      reason: "信号中断，吵架暂停"
    };
  }
};