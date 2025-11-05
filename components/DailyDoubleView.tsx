// This component manages the entire multi-step flow for a Daily Double question.
import React, { useState, useEffect } from 'react';
import { Team, Question, Scores } from '../types';
import CloseIcon from './icons/CloseIcon';

interface DailyDoubleViewProps {
  question: Question;
  scores: Scores;
  onComplete: (team: Team, wager: number, wasCorrect: boolean) => void;
  onCancel: () => void;
  playTimesUpSound: () => void;
  activeTeams: Team[];
}

type DailyDoubleStep = 'select_team' | 'set_wager' | 'show_clue' | 'show_response';

const teamButtonConfig: { team: Team; styles: string; text: string }[] = [
    { team: Team.Red, styles: 'bg-red-600 hover:bg-red-500', text: 'text-white' },
    { team: Team.Blue, styles: 'bg-blue-600 hover:bg-blue-500', text: 'text-white' },
    { team: Team.Green, styles: 'bg-green-600 hover:bg-green-500', text: 'text-white' },
    { team: Team.Yellow, styles: 'bg-yellow-500 hover:bg-yellow-400', text: 'text-black' },
    { team: Team.Purple, styles: 'bg-purple-600 hover:bg-purple-500', text: 'text-white' },
];

const DailyDoubleView: React.FC<DailyDoubleViewProps> = ({ question, scores, onComplete, onCancel, playTimesUpSound, activeTeams }) => {
  const [step, setStep] = useState<DailyDoubleStep>('select_team');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [wager, setWager] = useState(0);
  const [maxWager, setMaxWager] = useState(1000);
  const [timeLeft, setTimeLeft] = useState(10);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  useEffect(() => {
    if (step === 'show_clue' && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timerId);
    } else if (step === 'show_clue' && timeLeft === 0) {
      playTimesUpSound();
    }
  }, [step, timeLeft, playTimesUpSound]);
  
  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    // FIX: A team's score can be undefined; default to 0.
    const teamScore = scores[team] || 0;
    setMaxWager(Math.max(1000, teamScore));
    setWager(0);
    setStep('set_wager');
  };

  const handleWagerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setWager(0);
        return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setWager(Math.min(numValue, maxWager));
    }
  };

  const handleWagerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wager >= 5) {
      setStep('show_clue');
    }
  };
  
  const handleClose = () => {
    setShow(false);
    setTimeout(onCancel, 300);
  }

  const displayedTeams = teamButtonConfig.filter(config => activeTeams.includes(config.team));

  const renderContent = () => {
    switch (step) {
      case 'select_team':
        return (
          <>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-4 animate-pulse">DAILY DOUBLE!</h1>
            <p className="text-xl md:text-2xl mb-8">Which team found it?</p>
            <div className="flex flex-wrap justify-center gap-4 w-full max-w-lg">
              {displayedTeams.map(({ team, styles, text }) => (
                <button key={team} onClick={() => handleTeamSelect(team)} className={`p-6 rounded-lg text-2xl font-bold uppercase transition-transform hover:scale-105 w-40 ${styles} ${text}`}>
                  {team}
                </button>
              ))}
            </div>
          </>
        );
      
      case 'set_wager':
        return (
            <>
                <h1 className="text-5xl md:text-7xl font-extrabold mb-6">DAILY DOUBLE!</h1>
                <p className="text-xl md:text-2xl mb-8">{selectedTeam}, place your wager. You can risk up to ${maxWager}.</p>
                <form onSubmit={handleWagerSubmit} className="w-full flex flex-col items-center gap-4">
                <input
                    type="number"
                    value={wager === 0 ? '' : wager}
                    onChange={handleWagerChange}
                    placeholder="Wager (min $5)"
                    className="w-full max-w-sm p-4 text-3xl font-bold text-center bg-blue-950 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    min="5"
                    max={maxWager}
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={wager < 5}
                    className="px-8 py-4 bg-yellow-400 text-blue-900 font-bold text-2xl rounded-md hover:bg-yellow-300 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Set Wager & Show Clue
                </button>
                </form>
            </>
        );

      case 'show_clue':
        const RADIUS = 45;
        const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
        const progress = timeLeft / 10;
        const dashoffset = CIRCUMFERENCE * (1 - progress);

        return (
            <>
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter">
                    {question.clue}
                </h2>
                
                <div className="my-8 flex-grow flex items-center justify-center">
                    {timeLeft > 0 && (
                        <div className="relative w-36 h-36">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                {/* Background circle */}
                                <circle
                                    className="text-blue-800"
                                    strokeWidth="10"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={RADIUS}
                                    cx="50"
                                    cy="50"
                                />
                                {/* Progress circle */}
                                <circle
                                    className={`${timeLeft <= 3 ? 'text-red-500' : 'text-yellow-400'}`}
                                    strokeWidth="10"
                                    strokeDasharray={CIRCUMFERENCE}
                                    strokeDashoffset={dashoffset}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={RADIUS}
                                    cx="50"
                                    cy="50"
                                    style={{
                                        transform: 'rotate(-90deg) scaleX(-1)',
                                        transformOrigin: '50% 50%',
                                        transition: 'stroke-dashoffset 1s linear, stroke 0.5s'
                                    }}
                                />
                            </svg>
                            <span className={`absolute inset-0 flex items-center justify-center text-5xl font-black ${timeLeft <= 3 ? 'text-red-500 animate-ping' : 'text-yellow-300'}`}>
                                {timeLeft}
                            </span>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => setStep('show_response')}
                    className="px-8 py-4 bg-yellow-400 text-blue-900 font-bold text-2xl rounded-md hover:bg-yellow-300 transition-all"
                >
                    Reveal Correct Question
                </button>
            </>
        );

      case 'show_response':
        return (
            <>
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-8 tracking-tighter">
                    {question.response}
                </h2>
                <div className="flex flex-col items-center gap-4">
                    <p className="text-2xl font-bold">{selectedTeam}'s Wager: ${wager}</p>
                    <div className="flex gap-4">
                        <button onClick={() => onComplete(selectedTeam!, wager, true)} className="px-10 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-2xl rounded-md transition-transform hover:scale-105">
                            Correct
                        </button>
                        <button onClick={() => onComplete(selectedTeam!, wager, false)} className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-2xl rounded-md transition-transform hover:scale-105">
                            Incorrect
                        </button>
                    </div>
                </div>
            </>
        );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md"></div>
      <div className={`relative bg-blue-900 border-4 border-yellow-400 rounded-lg shadow-2xl w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center text-yellow-300 transform transition-transform duration-300 ${show ? 'scale-100' : 'scale-95'}`}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-yellow-300 hover:text-white transition-colors">
            <CloseIcon className="w-8 h-8" />
        </button>
        {renderContent()}
      </div>
    </div>
  );
};

export default DailyDoubleView;
