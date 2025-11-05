import { GoogleGenAI, Type } from "@google/genai";

let cachedClient = null;

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
};

const gameDataSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Category title"
      },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            clue: {
              type: Type.STRING,
              description: "Question clue phrased as an answer"
            },
            response: {
              type: Type.STRING,
              description: "Correct response phrased as a question"
            },
            value: {
              type: Type.NUMBER,
              description: "Point value (200, 400, 600, 800, 1000)"
            }
          },
          required: ["clue", "response", "value"]
        }
      }
    },
    required: ["title", "questions"]
  }
};

const BASE_PROMPT = `Generate a complete Jeopardy-style game board with 5 categories and 5 questions per category. 
The overall theme is "{topic}".
For each question, provide a clue (phrased as an answer) and a response (phrased as a question).
The point values for the questions in each category should be 200, 400, 600, 800, and 1000.
Ensure the categories are distinct and the questions range in difficulty.
Do not include a "Final Jeopardy" round.`;

const buildContents = (topic, context) => {
  const basePrompt = BASE_PROMPT.replace("{topic}", topic);
  if (!context) {
    return basePrompt;
  }

  if (context.type === "text") {
    return `${basePrompt}\nUse the following text as the primary source for categories and questions:\n---\n${context.data}`;
  }

  if (context.type === "pdf") {
    return {
      parts: [
        {
          text: `${basePrompt}\nUse the information in the attached PDF file as the primary source for categories and questions.`
        },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: context.data
          }
        }
      ]
    };
  }

  return basePrompt;
};

const parseResponse = (modelResponse) => {
  const maybeText =
    typeof modelResponse.text === "function"
      ? modelResponse.text()
      : modelResponse.text;

  const jsonText = typeof maybeText === "string" ? maybeText.trim() : "";
  if (!jsonText || jsonText[0] !== "[") {
    throw new Error("Model did not return a valid JSON array");
  }

  return JSON.parse(jsonText);
};

export default async function (context, req) {
  context.log("generate-game function invoked");

  const client = getClient();
  if (!client) {
    context.res = {
      status: 500,
      body: { error: "Server not configured with GEMINI_API_KEY" }
    };
    return;
  }

  const { topic, context: requestContext } = req.body || {};
  if (!topic || typeof topic !== "string") {
    context.res = {
      status: 400,
      body: { error: "Request body must include a topic string" }
    };
    return;
  }

  if (
    requestContext &&
    (typeof requestContext !== "object" ||
      !["pdf", "text"].includes(requestContext.type) ||
      typeof requestContext.data !== "string")
  ) {
    context.res = {
      status: 400,
      body: { error: "Invalid context payload" }
    };
    return;
  }

  try {
    const contents = buildContents(topic, requestContext);

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: gameDataSchema
      }
    });

    const parsedData = parseResponse(response);

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: { data: parsedData }
    };
  } catch (error) {
    context.log.error("Error generating game data:", error);
    context.res = {
      status: 502,
      body: { error: "Failed to generate game board" }
    };
  }
}
