import React, { useState, useEffect, useMemo } from 'react';
import { Team, Scores, FinalJeopardyQuestion } from '../types';

interface FinalJeopardyViewProps {
  question: FinalJeopardyQuestion;
  scores: Scores;
  onComplete: (finalScores: Scores) => void;
  playTimesUpSound: () => void;
}

type Step = 'category_reveal' | 'wagering' | 'clue' | 'scoring';

const FinalJeopardyView: React.FC<FinalJeopardyViewProps> = ({ question, scores, onComplete, playTimesUpSound }) => {
  const [step, setStep] = useState<Step>('category_reveal');
  // FIX: A team's score can be undefined; default to 0 for comparison.
  const eligibleTeams = useMemo(() => (Object.keys(scores) as Team[]).filter(team => (scores[team] || 0) > 0), [scores]);

  const [wagers, setWagers] = useState<Record<Team, number>>(() => {
    const initialWagers: Partial<Record<Team, number>> = {};
    eligibleTeams.forEach(team => {
        initialWagers[team] = 0;
    });
    return initialWagers as Record<Team, number>;
  });

  const [timeLeft, setTimeLeft] = useState(30);
  const [currentScores, setCurrentScores] = useState(scores);
  const [scoredTeams, setScoredTeams] = useState<Set<Team>>(new Set());


  useEffect(() => {
    if (step === 'category_reveal') {
      const timer = setTimeout(() => setStep('wagering'), 4000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'clue' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => {
        clearInterval(timer);
      };
    } else if (step === 'clue' && timeLeft === 0) {
      playTimesUpSound();
      setStep('scoring');
    }
  }, [step, timeLeft, playTimesUpSound]);

  const handleWagerChange = (team: Team, value: string) => {
    const numValue = parseInt(value, 10);
    // FIX: A team's score can be undefined; default to 0.
    const maxWager = currentScores[team] || 0;
    if (!isNaN(numValue)) {
      setWagers(prev => ({ ...prev, [team]: Math.max(0, Math.min(numValue, maxWager)) }));
    } else {
      setWagers(prev => ({ ...prev, [team]: 0 }));
    }
  };

  const handleScoring = (team: Team, correct: boolean) => {
    const newScores = { ...currentScores };
    const wager = wagers[team];
    // FIX: A team's score can be undefined; default to 0 before calculating new score.
    newScores[team] = (newScores[team] || 0) + (correct ? wager : -wager);
    
    const newScoredTeams = new Set(scoredTeams).add(team);
    setScoredTeams(newScoredTeams);
    setCurrentScores(newScores);

    const remainingToScore = eligibleTeams.filter(t => !newScoredTeams.has(t));
    if (remainingToScore.length === 0) {
        onComplete(newScores);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'category_reveal':
        return (
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Final Jeopardy Category:</h1>
            <h2 className="text-7xl font-extrabold text-yellow-300 animate-pulse">{question.category}</h2>
          </div>
        );
      case 'wagering':
        return (
          <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
            <h1 className="text-5xl font-bold mb-4">Place Your Wagers</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {eligibleTeams.map(team => (
                <div key={team} className="flex flex-col items-center gap-2 bg-black/20 p-4 rounded-lg">
                  <label htmlFor={`wager-${team}`} className="text-2xl font-bold">{team}</label>
                  <input
                    id={`wager-${team}`}
                    type="number"
                    min="0"
                    // FIX: A team's score can be undefined; default to 0.
                    max={currentScores[team] || 0}
                    value={wagers[team] === undefined ? 0 : wagers[team]}
                    onChange={(e) => handleWagerChange(team, e.target.value)}
                    className="w-full p-2 text-2xl font-bold text-center bg-blue-950 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                   {/* FIX: A team's score can be undefined; default to 0. */}
                   <p className="text-sm text-gray-400">Max: ${currentScores[team] || 0}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setStep('clue')} className="mt-6 px-8 py-4 bg-yellow-400 text-blue-900 font-bold text-2xl rounded-md hover:bg-yellow-300 transition-all">
              Lock Wagers & Reveal Clue
            </button>
          </div>
        );
      case 'clue':
        return (
            <div className="flex flex-col items-center justify-between h-full">
                <div className="flex-grow flex items-center">
                    <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight">{question.clue}</h2>
                </div>
                <div className="text-7xl font-black text-yellow-300">{timeLeft}</div>
            </div>
        );
      case 'scoring':
        const teamsToScore = eligibleTeams.filter(t => !scoredTeams.has(t));
        return (
            <div className="flex flex-col items-center gap-6 w-full">
                <h1 className="text-3xl font-bold">Correct Response:</h1>
                <h2 className="text-5xl font-extrabold text-yellow-300 mb-6">{question.response}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                    {teamsToScore.map(team => (
                        <div key={team} className="bg-black/20 p-6 rounded-lg flex flex-col items-center">
                            <h3 className="text-3xl font-bold mb-2">{team}</h3>
                            <p className="text-xl mb-4">Wager: ${wagers[team]}</p>
                            <div className="flex gap-4">
                                <button onClick={() => handleScoring(team, true)} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded-md">Correct</button>
                                <button onClick={() => handleScoring(team, false)} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-md">Incorrect</button>
                            </div>
                        </div>
                    ))}
                </div>
                 {teamsToScore.length === 0 && (
                    <button onClick={() => onComplete(currentScores)} className="mt-6 px-8 py-4 bg-yellow-400 text-blue-900 font-bold text-2xl rounded-md hover:bg-yellow-300 transition-all">
                        Finish Game
                    </button>
                 )}
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-20 bg-blue-950 flex items-center justify-center p-8">
      {renderContent()}
    </div>
  );
};

export default FinalJeopardyView;