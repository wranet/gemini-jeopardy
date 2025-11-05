import React, { useState, useEffect } from 'react';
import { Team } from '../types';
import type { Question } from '../types';
import CloseIcon from './icons/CloseIcon';

interface QuestionViewProps {
  question: Question;
  onAwardPoints: (team: Team, points: number) => void;
  onDeductPoints: (team: Team, points: number) => void;
  onClose: () => void;
  activeTeams: Team[];
}

const teamButtonConfig: { team: Team; styles: string }[] = [
    { team: Team.Red, styles: 'bg-red-600' },
    { team: Team.Blue, styles: 'bg-blue-600' },
    { team: Team.Green, styles: 'bg-green-600' },
    { team: Team.Yellow, styles: 'bg-yellow-500' },
    { team: Team.Purple, styles: 'bg-purple-600' },
];

const QuestionView: React.FC<QuestionViewProps> = ({ question, onAwardPoints, onDeductPoints, onClose, activeTeams }) => {
  const [isResponseVisible, setIsResponseVisible] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300); // Wait for animation to finish
  };

  const displayedTeams = teamButtonConfig.filter(config => activeTeams.includes(config.team));
  const numTeams = displayedTeams.length;

  let gridClass = 'lg:grid-cols-4';
  if (numTeams === 2) gridClass = 'lg:grid-cols-2';
  else if (numTeams === 3) gridClass = 'lg:grid-cols-3';
  else if (numTeams === 5) gridClass = 'lg:grid-cols-5';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md" onClick={handleClose}></div>
      <div className={`relative bg-blue-900 border-4 border-yellow-400 rounded-lg shadow-2xl w-full h-full flex flex-col items-center justify-between p-8 md:p-12 text-center text-yellow-300 transform transition-transform duration-300 ${show ? 'scale-100' : 'scale-95'}`}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-yellow-300 hover:text-white transition-colors">
          <CloseIcon className="w-8 h-8" />
        </button>

        <div className="flex-grow flex flex-col items-center justify-center w-full">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-8 tracking-tighter">
                {isResponseVisible ? question.response : question.clue}
            </h2>
        </div>

        <div className="flex-shrink-0 w-full flex flex-col items-center gap-6">
            {!isResponseVisible && (
                <button 
                    onClick={() => setIsResponseVisible(true)}
                    className="px-8 py-4 bg-yellow-400 text-blue-900 font-bold text-2xl rounded-md hover:bg-yellow-300 transition-all"
                >
                    Reveal Correct Question
                </button>
            )}
             <div className="flex flex-col items-center w-full">
                <p className="text-white mb-4 text-lg">Award or deduct points:</p>
                <div className={`grid grid-cols-2 ${gridClass} gap-4 w-full max-w-5xl`}>
                   {displayedTeams.map(({team, styles}) => (
                        <div key={team} className={`p-4 rounded-lg shadow-lg flex flex-col items-center ${styles}`}>
                           <span className={`text-xl font-bold uppercase mb-3 ${team === Team.Yellow ? 'text-black' : 'text-white'}`}>{team}</span>
                            <div className="flex gap-2 w-full justify-center">
                                <button
                                   title={`Award ${question.value} to ${team}`}
                                   aria-label={`Award ${question.value} points to ${team}`}
                                   onClick={() => onAwardPoints(team, question.value)}
                                   className="w-16 h-16 flex items-center justify-center text-3xl font-black rounded-full transition-transform hover:scale-110 shadow-md bg-white/30 hover:bg-white/40"
                                >
                                    +
                                </button>
                                <button
                                   title={`Deduct ${question.value} from ${team}`}
                                   aria-label={`Deduct ${question.value} points from ${team}`}
                                   onClick={() => onDeductPoints(team, question.value)}
                                   className="w-16 h-16 flex items-center justify-center text-3xl font-black rounded-full transition-transform hover:scale-110 shadow-md bg-black/20 hover:bg-black/30"
                                >
                                    -
                                </button>
                            </div>
                        </div>
                   ))}
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionView;