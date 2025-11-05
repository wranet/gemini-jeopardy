// This service handles communication with the Google Gemini API to generate game data.
import { GoogleGenAI, Type } from "@google/genai";
import type { GameData, FinalJeopardyQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const gameDataSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'The category title.',
      },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            clue: {
              type: Type.STRING,
              description: 'The clue for the question, phrased as an answer.',
            },
            response: {
              type: Type.STRING,
              description: 'The correct response, phrased as a question (e.g., "What is...?").',
            },
            value: {
              type: Type.NUMBER,
              description: 'The point value of the question (e.g., 200, 400, 600, 800, 1000).',
            },
          },
          required: ['clue', 'response', 'value'],
        },
      },
    },
    required: ['title', 'questions'],
  },
};

const finalJeopardySchema = {
    type: Type.OBJECT,
    properties: {
        category: {
            type: Type.STRING,
            description: "The category for the Final Jeopardy question."
        },
        clue: {
            type: Type.STRING,
            description: "The clue for the question, phrased as an answer."
        },
        response: {
            type: Type.STRING,
            description: "The correct response, phrased as a question (e.g., 'What is...?')."
        }
    },
    required: ["category", "clue", "response"]
}

export const generateGameData = async (
  topic: string, 
  context?: { type: 'pdf' | 'text', data: string }
): Promise<GameData | null> => {
  try {
    let contents: any;

    const basePrompt = `Generate a complete Jeopardy-style game board with 5 categories and 5 questions per category. The overall theme is "${topic}".
For each question, provide a clue (phrased as an answer) and a response (phrased as a question).
The point values for the questions in each category should be 200, 400, 600, 800, and 1000.
Ensure the categories are distinct and the questions range in difficulty.
Do not include a "Final Jeopardy" round.`;

    if (context?.type === 'text') {
      contents = `${basePrompt}\nUse the following text as the primary source for categories and questions:\n---\n${context.data}`;
    } else if (context?.type === 'pdf') {
      contents = {
        parts: [
          { text: `${basePrompt}\nUse the information in the attached PDF file as the primary source for categories and questions.` },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: context.data,
            },
          },
        ],
      };
    } else {
      contents = basePrompt;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: gameDataSchema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText.startsWith('[')) {
        console.error("Invalid JSON response:", jsonText);
        return null;
    }

    const parsedData = JSON.parse(jsonText);

    // Add `answered` and `dailyDouble` properties
    const gameData: GameData = parsedData.map((category: any) => ({
      ...category,
      questions: category.questions.map((q: any) => ({ ...q, answered: false, dailyDouble: false })),
    }));

    // Randomly assign two daily doubles
    const numCategories = gameData.length;
    if (numCategories > 0) {
      const numQuestions = gameData[0]?.questions.length || 0;
      if (numCategories * numQuestions >= 2) {
        let assigned = 0;
        const assignedCoords = new Set<string>();
        while (assigned < 2) {
          const randomCat = Math.floor(Math.random() * numCategories);
          const randomQ = Math.floor(Math.random() * numQuestions);
          const coord = `${randomCat}-${randomQ}`;
          if (!assignedCoords.has(coord)) {
            gameData[randomCat].questions[randomQ].dailyDouble = true;
            assignedCoords.add(coord);
            assigned++;
          }
        }
      }
    }

    return gameData;
  } catch (error) {
    console.error("Error generating game data:", error);
    return null;
  }
};


export const generateFinalJeopardyData = async (
  topic: string,
  context?: { type: 'pdf' | 'text', data: string }
): Promise<FinalJeopardyQuestion | null> => {
    try {
        let contents: any;
        const basePrompt = `Generate a single, challenging Final Jeopardy question based on the topic "${topic}". Provide a category, a clue (phrased as an answer), and a response (phrased as a question).`;

        if (context?.type === 'text') {
          contents = `${basePrompt}\nBase the question on the following source material:\n\n${context.data}`;
        } else if (context?.type === 'pdf') {
          contents = {
            parts: [
              { text: `${basePrompt}\nBase the question on the provided PDF file.` },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: context.data,
                },
              },
            ],
          };
        } else {
          contents = basePrompt;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: finalJeopardySchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);
        return parsedData;

    } catch (error) {
        console.error("Error generating Final Jeopardy data:", error);
        return null;
    }
}
