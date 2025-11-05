import React, { useState } from 'react';
import UploadIcon from './icons/UploadIcon';

interface GameSetupProps {
  onGameStart: (topic: string, numTeams: number, context?: { type: 'pdf' | 'text', data: string }) => void;
  isLoading: boolean;
  error: string | null;
}

const GameSetup: React.FC<GameSetupProps> = ({ onGameStart, isLoading, error }) => {
  const [topic, setTopic] = useState('');
  const [numTeams, setNumTeams] = useState(4);
  const [pdfFile, setPdfFile] = useState<{name: string, data: string} | null>(null);
  const [pastedText, setPastedText] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPastedText(''); // Clear other context source
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const base64Data = result.split(',')[1];
        setPdfFile({ name: file.name, data: base64Data });
      };
      reader.readAsDataURL(file);
    } else {
        setPdfFile(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPastedText(e.target.value);
    if (pdfFile) {
        setPdfFile(null); // Clear other context source
        const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
    }
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isLoading) {
      let context;
      if (pdfFile) {
        context = { type: 'pdf' as const, data: pdfFile.data };
      } else if (pastedText.trim()) {
        context = { type: 'text' as const, data: pastedText.trim() };
      }
      onGameStart(topic.trim(), numTeams, context);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl md:text-8xl font-extrabold text-yellow-300 tracking-tighter mb-4">GEMINI JEOPARDY</h1>
      <p className="text-xl md:text-2xl text-gray-300 mb-10">Enter a topic and select the number of teams to play!</p>
      
      <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col items-center gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="md:col-span-2">
                <label htmlFor="topic-input" className="text-lg text-gray-300 mb-2 block text-left font-semibold">1. Enter a Topic</label>
                <input
                  id="topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-gray-800 border-2 border-blue-700 rounded-md px-4 py-3 text-white text-xl text-center focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                  placeholder="e.g., 'The Renaissance'"
                  disabled={isLoading}
                  autoFocus
                />
            </div>
            <div>
                <label className="text-lg text-gray-300 mb-2 block text-left font-semibold">2. Teams</label>
                <div className="flex justify-center gap-1 rounded-md bg-gray-800 p-1 h-[54px]">
                  {[2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumTeams(n)}
                      className={`w-full h-full text-lg font-semibold rounded-md transition-colors ${
                        numTeams === n ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-700'
                      }`}
                      disabled={isLoading}
                    >
                      {n}
                    </button>
                  ))}
                </div>
            </div>
        </div>

        <div className="w-full">
            <label className="text-lg text-gray-300 mb-2 block text-left font-semibold">3. (Optional) Provide Context for Questions</label>
            <div className="rounded-md bg-gray-800 p-4">
                <div className="mb-4">
                  <p className="font-medium mb-2 text-left text-gray-300">Upload a PDF</p>
                  <label htmlFor="pdf-upload" className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 border-dashed transition-colors ${
                      pdfFile ? 'border-green-500 bg-green-900/50' : 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50 cursor-pointer'
                  }`}>
                    <UploadIcon className="w-6 h-6 flex-shrink-0" />
                    <span className="truncate">{pdfFile ? pdfFile.name : 'Click to upload a PDF file'}</span>
                  </label>
                  <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" disabled={isLoading} />
                  {pdfFile && (
                    <button type="button" onClick={() => { setPdfFile(null); (document.getElementById('pdf-upload') as HTMLInputElement).value = ''; }} className="text-sm text-red-400 hover:text-red-300 mt-2">
                      Remove File
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-4 my-4">
                    <hr className="flex-grow border-gray-600" />
                    <span className="text-gray-400 font-bold">OR</span>
                    <hr className="flex-grow border-gray-600" />
                </div>

                <div>
                  <p className="font-medium mb-2 text-left text-gray-300">Paste Text</p>
                  <textarea
                    value={pastedText}
                    onChange={handleTextChange}
                    className="w-full bg-gray-900 border-2 border-gray-600 rounded-md px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all h-32 resize-y"
                    placeholder="Paste text here to use as a source for questions..."
                    disabled={isLoading}
                  />
                  {pastedText && (
                    <button type="button" onClick={() => setPastedText('')} className="text-sm text-red-400 hover:text-red-300 mt-2">
                      Clear Text
                    </button>
                  )}
                </div>
            </div>
        </div>
        
        <button 
          type="submit" 
          className="w-full px-6 py-4 mt-2 bg-blue-700 hover:bg-blue-600 rounded-md font-semibold text-xl transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          disabled={isLoading || !topic.trim()}
        >
          {isLoading ? 'Generating Game...' : 'Start Game'}
        </button>
      </form>

      {error && <p className="text-red-400 mt-6 text-lg">{error}</p>}
    </div>
  );
};

export default GameSetup;