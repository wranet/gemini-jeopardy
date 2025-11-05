// This is the main application component that manages game state and renders all other components.
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import GameBoard from './components/GameBoard';
import Scoreboard from './components/Scoreboard';
import QuestionView from './components/QuestionView';
import DailyDoubleView from './components/DailyDoubleView';
import GameSetup from './components/GameSetup';
import FinalJeopardyView from './components/FinalJeopardyView';
import { generateGameData, generateFinalJeopardyData } from './services/geminiService';
import type { GameData, Question, Scores, FinalJeopardyQuestion } from './types';
import { Team } from './types';

const allTeams = Object.values(Team);

type GameState = 'setup' | 'loading' | 'playing' | 'final_jeopardy_loading' | 'final_jeopardy' | 'game_over';
type GameContext = { type: 'pdf' | 'text', data: string };

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [finalJeopardyData, setFinalJeopardyData] = useState<FinalJeopardyQuestion | null>(null);
  const [scores, setScores] = useState<Scores>({});
  const [activeTeams, setActiveTeams] = useState<Team[]>(allTeams.slice(0, 4));
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ cat: number, q: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState<GameContext | null>(null);
  const [isDailyDouble, setIsDailyDouble] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);


  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  const playSound = (type: 'correct' | 'incorrect' | 'timesup') => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
  
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);

    if (type === 'correct') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
    } else if (type === 'incorrect') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    } else { // timesup
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
    }
  
    oscillator.start(audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
    oscillator.stop(audioCtx.currentTime + 0.5);
  };

  const playCorrectSound = useCallback(() => playSound('correct'), []);
  const playIncorrectSound = useCallback(() => playSound('incorrect'), []);
  const playTimesUpSound = useCallback(() => playSound('timesup'), []);


  const handleGameStart = async (gameTopic: string, numTeams: number, gameContext?: GameContext) => {
    setTopic(gameTopic);
    setContext(gameContext || null);
    setGameState('loading');
    setError(null);
    setGameData(null);
    setFinalJeopardyData(null);

    const selectedTeams = allTeams.slice(0, numTeams);
    setActiveTeams(selectedTeams);
    
    const initialScoresForGame: Scores = {};
    selectedTeams.forEach(team => {
        initialScoresForGame[team] = 0;
    });
    setScores(initialScoresForGame);
    
    try {
      const data = await generateGameData(gameTopic, gameContext);
      if (data) {
        setGameData(data);
        setGameState('playing');
      } else {
        setError('Failed to generate game data. The response from the AI was invalid. Please try a different topic.');
        setGameState('setup');
      }
    } catch (e) {
      setError('An error occurred while fetching game data. Please check the console and try again.');
      setGameState('setup');
      console.error(e);
    }
  };
  
  const isBoardCleared = useMemo(() => {
    if (!gameData) return false;
    return gameData.every(category => category.questions.every(q => q.answered));
  }, [gameData]);

  useEffect(() => {
    const fetchFinalJeopardy = async () => {
        const data = await generateFinalJeopardyData(topic, context || undefined);
        if (data) {
            setFinalJeopardyData(data);
            setGameState('final_jeopardy');
        } else {
            setError("Could not load Final Jeopardy. Starting a new game.");
            setTimeout(() => setGameState('setup'), 3000);
        }
    }
    if(isBoardCleared && gameState === 'playing' && topic) {
        setGameState('final_jeopardy_loading');
        fetchFinalJeopardy();
    }
  }, [isBoardCleared, gameState, topic, context]);


  const handleQuestionSelect = (catIndex: number, qIndex: number) => {
    const question = gameData![catIndex].questions[qIndex];
    setSelectedCoords({ cat: catIndex, q: qIndex });
    setSelectedQuestion(question);
    if (question.dailyDouble) setIsDailyDouble(true);
  };

  const handleCloseQuestion = () => {
    if (gameData && selectedCoords) {
      const newGameData = gameData.map((category, catIndex) => {
        if (catIndex !== selectedCoords.cat) return category;
        return {
          ...category,
          questions: category.questions.map((question, qIndex) => {
            if (qIndex !== selectedCoords.q) return question;
            return { ...question, answered: true };
          }),
        };
      });
      setGameData(newGameData);
    }
    setSelectedQuestion(null);
    setSelectedCoords(null);
    setIsDailyDouble(false);
  };

  const handleScoreChange = (team: Team, points: number) => {
    setScores(prevScores => ({
      ...prevScores,
      // FIX: Add nullish coalescing operator to handle potentially undefined score.
      [team]: (prevScores[team] || 0) + points
    }));
  };

  const handleAwardPoints = (team: Team, points: number) => {
    playCorrectSound();
    handleScoreChange(team, points);
    handleCloseQuestion();
  };
  
  const handleDeductPoints = (team: Team, points: number) => {
    playIncorrectSound();
    handleScoreChange(team, -points);
  };

  const handleDailyDoubleComplete = (team: Team, wager: number, wasCorrect: boolean) => {
    if (wasCorrect) playCorrectSound();
    else playIncorrectSound();
    handleScoreChange(team, wasCorrect ? wager : -wager);
    handleCloseQuestion();
  };

  const handleFinalJeopardyComplete = (finalScores: Scores) => {
    setScores(finalScores);
    setGameState('game_over');
  };

  const handleStartNewGame = () => {
    setGameState('setup');
    setScores({});
    setContext(null);
  };

  const renderGameState = () => {
    switch(gameState) {
        case 'setup':
            return <GameSetup onGameStart={handleGameStart} isLoading={false} error={error} />;
        case 'loading':
            return <GameSetup onGameStart={handleGameStart} isLoading={true} error={null} />;
        case 'final_jeopardy_loading':
            return <div className="flex-grow flex items-center justify-center text-3xl font-bold text-yellow-300">Loading Final Jeopardy...</div>;
        case 'game_over': {
            const teamScores = Object.entries(scores) as [Team, number][];
            const maxScore = Math.max(...teamScores.map(([, score]) => score));
            
            let winnerMessage;

            if (maxScore <= 0) {
                winnerMessage = "No winner this round!";
            } else {
                const winners = teamScores
                    .filter(([, score]) => score === maxScore)
                    .map(([team]) => team);

                if (winners.length === 1) {
                    winnerMessage = `The winner is Team ${winners[0]}!`;
                } else {
                    winnerMessage = `It's a tie between Teams ${winners.join(' and ')}!`;
                }
            }
            
            return (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-6xl font-extrabold text-yellow-300 mb-4">Game Over!</h1>
                    <h2 className="text-4xl font-bold mb-8">{winnerMessage}</h2>
                    <div className="mb-10 w-full max-w-4xl"><Scoreboard scores={scores} /></div>
                    <button onClick={handleStartNewGame} className="px-8 py-4 bg-blue-700 hover:bg-blue-600 rounded-md font-semibold text-2xl transition-colors">
                        Play Again
                    </button>
                </div>
            );
        }
        case 'final_jeopardy':
            return finalJeopardyData && <FinalJeopardyView question={finalJeopardyData} scores={scores} onComplete={handleFinalJeopardyComplete} playTimesUpSound={playTimesUpSound} />;
        case 'playing':
            return (
                <>
                    <main className="flex-grow flex flex-col">
                        {gameData && <GameBoard gameData={gameData} onQuestionSelect={handleQuestionSelect} />}
                    </main>
                    {gameData && Object.keys(scores).length > 0 && <Scoreboard scores={scores} />}
                </>
            );
        default:
            return null;
    }
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col font-sans">
      {(gameState !== 'setup' && gameState !== 'loading') && (
        <header className="bg-gray-900/80 backdrop-blur-sm p-4 sticky top-0 z-10 border-b-2 border-blue-500 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl md:text-4xl font-bold text-yellow-300 tracking-tighter">GEMINI JEOPARDY</h1>
            <p className="text-lg text-gray-300 hidden md:block">Topic: <span className="font-semibold text-white">{topic}</span></p>
            <button onClick={handleStartNewGame} className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-md font-semibold transition-colors">
              Start New Game
            </button>
          </div>
        </header>
      )}

      {renderGameState()}

      {isDailyDouble && selectedQuestion && (
        <DailyDoubleView 
            question={selectedQuestion}
            scores={scores}
            onComplete={handleDailyDoubleComplete}
            onCancel={handleCloseQuestion}
            playTimesUpSound={playTimesUpSound}
            activeTeams={activeTeams}
        />
      )}

      {!isDailyDouble && selectedQuestion && (
        <QuestionView 
          question={selectedQuestion} 
          onAwardPoints={handleAwardPoints}
          onDeductPoints={handleDeductPoints}
          onClose={handleCloseQuestion} 
          activeTeams={activeTeams}
        />
      )}
    </div>
  );
};

export default App;