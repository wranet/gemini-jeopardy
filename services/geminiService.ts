// This service communicates with the Azure Functions backend to generate Jeopardy content.
import type { GameData, FinalJeopardyQuestion } from "../types";

type ContextPayload = { type: "pdf" | "text"; data: string };

interface RawQuestion {
  clue: string;
  response: string;
  value: number;
}

interface RawCategory {
  title: string;
  questions: RawQuestion[];
}

type RawGameData = RawCategory[];

interface GenerateGameResponse {
  data: RawGameData;
}

const API_BASE = "/api";

const postJson = async <TResponse>(
  path: string,
  payload: Record<string, unknown>
): Promise<TResponse> => {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || `Request to ${path} failed with status ${response.status}`
    );
  }

  return (await response.json()) as TResponse;
};

const addClientSideMetadata = (rawData: RawGameData): GameData => {
  const gameData: GameData = rawData.map((category) => ({
    title: category.title,
    questions: category.questions.map((question) => ({
      ...question,
      answered: false,
      dailyDouble: false
    }))
  }));

  const numCategories = gameData.length;
  if (numCategories > 0) {
    const questionsPerCategory = gameData[0]?.questions.length ?? 0;
    if (numCategories * questionsPerCategory >= 2) {
      let assigned = 0;
      const picked = new Set<string>();
      while (assigned < 2) {
        const randomCat = Math.floor(Math.random() * numCategories);
        const randomQuestion = Math.floor(Math.random() * questionsPerCategory);
        const key = `${randomCat}-${randomQuestion}`;
        if (!picked.has(key)) {
          gameData[randomCat].questions[randomQuestion].dailyDouble = true;
          picked.add(key);
          assigned += 1;
        }
      }
    }
  }

  return gameData;
};

export const generateGameData = async (
  topic: string,
  context?: ContextPayload
): Promise<GameData | null> => {
  try {
    const payload: Record<string, unknown> = { topic };
    if (context) {
      payload.context = context;
    }

    const { data } = await postJson<GenerateGameResponse>(
      "generate-game",
      payload
    );

    return addClientSideMetadata(data);
  } catch (error) {
    console.error("Error requesting game data:", error);
    return null;
  }
};

export const generateFinalJeopardyData = async (
  topic: string,
  context?: ContextPayload
): Promise<FinalJeopardyQuestion | null> => {
  try {
    const payload: Record<string, unknown> = { topic };
    if (context) {
      payload.context = context;
    }

    return await postJson<FinalJeopardyQuestion>(
      "generate-final",
      payload
    );
  } catch (error) {
    console.error("Error requesting Final Jeopardy data:", error);
    return null;
  }
};
