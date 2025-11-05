import React from 'react';
import { Team } from '../types';
import type { Scores } from '../types';

interface ScoreboardProps {
  scores: Scores;
}

const teamColors: Record<Team, string> = {
  [Team.Red]: 'bg-red-600',
  [Team.Blue]: 'bg-blue-600',
  [Team.Green]: 'bg-green-600',
  [Team.Yellow]: 'bg-yellow-500 text-black',
  [Team.Purple]: 'bg-purple-600',
};

const Scoreboard: React.FC<ScoreboardProps> = ({ scores }) => {
  const teams = (Object.keys(scores) as Team[]);
  const numTeams = teams.length;

  let gridClass = 'grid-cols-2 md:grid-cols-4';
  if (numTeams === 2) {
    gridClass = 'grid-cols-2';
  } else if (numTeams === 3) {
    gridClass = 'grid-cols-3';
  } else if (numTeams === 5) {
    gridClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';
  }


  return (
    <div className="w-full bg-gray-900/80 backdrop-blur-sm p-4 sticky bottom-0 border-t-2 border-blue-500 shadow-2xl">
      <div className={`grid ${gridClass} gap-4 max-w-7xl mx-auto`}>
        {teams.map((team) => (
          <div key={team} className={`p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-white ${teamColors[team]}`}>
            <span className="text-lg md:text-xl font-bold uppercase tracking-wider">{team}</span>
            <span className="text-2xl md:text-4xl font-black">${scores[team]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;