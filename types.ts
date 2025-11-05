// Defines the core data structures for the Jeopardy game application.

export interface Question {
  clue: string;
  response: string;
  value: number;
  answered: boolean;
  dailyDouble: boolean;
}

export interface Category {
  title: string;
  questions: Question[];
}

export type GameData = Category[];

export interface FinalJeopardyQuestion {
  category: string;
  clue: string;
  response: string;
}

export enum Team {
  Red = 'Red',
  Blue = 'Blue',
  Green = 'Green',
  Yellow = 'Yellow',
  Purple = 'Purple',
}

// FIX: Changed Scores to a partial record to reflect that it only holds scores for active teams.
export type Scores = Partial<Record<Team, number>>;
