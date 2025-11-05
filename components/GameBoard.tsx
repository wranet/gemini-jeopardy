
import React from 'react';
import type { GameData } from '../types';

interface GameBoardProps {
  gameData: GameData;
  onQuestionSelect: (categoryIndex: number, questionIndex: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameData, onQuestionSelect }) => {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  const numCategories = gameData.length;
  const numQuestions = gameData[0]?.questions.length || 0;

  return (
    <div className="flex-grow p-4 md:p-6 lg:p-8 grid gap-1.5 md:gap-2" style={{ gridTemplateColumns: `repeat(${numCategories}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${numQuestions}, minmax(0, 1fr))` }}>
      {/* Category Headers */}
      {gameData.map((category, catIndex) => (
        <div key={catIndex} className="bg-blue-900 flex items-center justify-center p-2 md:p-4 rounded-md shadow-lg text-center font-bold text-yellow-300 text-xs sm:text-sm md:text-base lg:text-lg uppercase tracking-wider">
          {category.title}
        </div>
      ))}

      {/* Questions Grid */}
      {Array.from({ length: numQuestions }).map((_, rowIndex) => (
        <React.Fragment key={rowIndex}>
          {gameData.map((category, colIndex) => {
            const question = category.questions[rowIndex];
            return (
              <div
                key={`${colIndex}-${rowIndex}`}
                className={`flex items-center justify-center p-4 rounded-md shadow-lg transition-all duration-300 ${
                  question.answered
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-800 hover:bg-blue-700 cursor-pointer'
                }`}
                onClick={() => !question.answered && onQuestionSelect(colIndex, rowIndex)}
              >
                {!question.answered && (
                  <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-yellow-400">
                    ${question.value}
                  </span>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default GameBoard;
