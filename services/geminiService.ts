import { GoogleGenAI, Type, Schema } from "@google/genai";

const getAiClient = () => {
  // In Vite with 'define', this becomes a string literal or undefined.
  // We access it directly to ensure replacement works.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing!");
    throw new Error("API Key is missing. Please check your environment variables.");
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
  try {
    const ai = getAiClient();
    
    const prompt = `
      This is for a Chinese debate game.
      The topic of a playful dispute is: "${topic}".
      A user's stance is: "${stance}".
      Generate 12 short, punchy, colloquial CHINESE arguments (max 12 Chinese characters each) that support this stance.
      They should sound like spoken language in a chat or a funny argument (e.g., "这明明就是我的理！", "根本不是那样").
      Return strictly a JSON array of strings in Simplified Chinese.
    `;

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
  try {
    const ai = getAiClient();

    // UPGRADED PROMPT: Focus on Real-time Judgment based on "Emotional Damage" and Wit.
    const prompt = `
      Context: A specialized AI for a debate game "Judge for Us" (都来评评理).
      Topic: "${topic}"
      
      Characters:
      - Player 1 (${p1Name}): Holding stance "${arg1}" ${isP1Manual ? "(Manually input by user, be responsive to this!)" : ""}
      - Player 2 (${p2Name}): Holding stance "${arg2}" ${isP2Manual ? "(Manually input by user, be responsive to this!)" : ""}
      
      --- INSTRUCTIONS ---
      
      STEP 1: GENERATE THE FIGHT (Dialogue)
      Create a short, spicy, and colloquial dialogue (2-4 turns).
      - P1 speaks first using their stance.
      - P2 MUST retort directly to what P1 said.
      - Focus on "divine comebacks" (神回复), sarcasm, or emotional outbursts.
      - Language: Simplified Chinese.
      
      STEP 2: JUDGE THE RESULT (The Verdict)
      Based EXCLUSIVELY on the dialogue you just wrote in Step 1, decide who won.
      - DO NOT Randomize. Judge based on "Emotional Damage" and Logic.
      - If P2's comeback was weak or generic -> P1 Wins (Score > 60).
      - If P2's comeback was a "mic drop" moment or exposed a flaw -> P2 Wins (Score < 40).
      - If it's a messy tie -> Score ~50.
      
      Reason format: A short, spicy comment from an onlooker's perspective explaining WHY one side won. (e.g., "P2这一句绝杀！", "P1逻辑感人...", "无法反驳P2的歪理").
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
        voteP1: { 
          type: Type.INTEGER,
          description: "Score from 0 to 100. >50 means P1 wins. <50 means P2 wins. Be decisive based on the dialogue quality." 
        },
        reason: { 
          type: Type.STRING,
          description: "A short, specific comment (max 20 chars) on why that specific player won this round."
        }
      },
      required: ["dialogue", "voteP1", "reason"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        // Temperature slightly higher for creativity in dialogue, but the prompt constraints logic.
        temperature: 1.0 
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
      reason: "信号中断，本次平局"
    };
  }
};