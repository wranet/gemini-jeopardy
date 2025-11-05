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

const finalJeopardySchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: "Final Jeopardy category"
    },
    clue: {
      type: Type.STRING,
      description: "Final Jeopardy clue phrased as an answer"
    },
    response: {
      type: Type.STRING,
      description: "Correct response phrased as a question"
    }
  },
  required: ["category", "clue", "response"]
};

const buildContents = (topic, context) => {
  const basePrompt = `Generate a single, challenging Final Jeopardy question based on the topic "${topic}". Provide a category, a clue (phrased as an answer), and a response (phrased as a question).`;

  if (!context) {
    return basePrompt;
  }

  if (context.type === "text") {
    return `${basePrompt}\nBase the question on the following source material:\n\n${context.data}`;
  }

  if (context.type === "pdf") {
    return {
      parts: [
        {
          text: `${basePrompt}\nBase the question on the provided PDF file.`
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
  if (!jsonText || jsonText[0] !== "{") {
    throw new Error("Model did not return a valid JSON object");
  }

  return JSON.parse(jsonText);
};

export default async function (context, req) {
  context.log("generate-final function invoked");

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
        responseSchema: finalJeopardySchema
      }
    });

    const parsedData = parseResponse(response);

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: parsedData
    };
  } catch (error) {
    context.log.error("Error generating final jeopardy data:", error);
    context.res = {
      status: 502,
      body: { error: "Failed to generate Final Jeopardy question" }
    };
  }
}
