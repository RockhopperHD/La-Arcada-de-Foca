
import React from 'react';

interface InputPanelProps {
    gameIdea: string;
    onGameIdeaChange: (value: string) => void;
    targetLang: string;
    onTargetLangChange: (value: string) => void;
    comfLang: string;
    onComfLangChange: (value: string) => void;
    onGenerate: () => void;
    isGenerating: boolean;
    error: string | null;
}

const InputPanel: React.FC<InputPanelProps> = ({ 
    gameIdea, onGameIdeaChange, 
    targetLang, onTargetLangChange,
    comfLang, onComfLangChange,
    onGenerate, isGenerating, error 
}) => {
    return (
        <div className="flex flex-col bg-gray-900 h-full">
            <h2 className="text-xl font-bold mb-3 text-blue-400">
                Game Configuration
            </h2>
            
            <div className="flex flex-col space-y-4 flex-grow">
                <div>
                    <label htmlFor="gameIdea" className="block text-sm font-medium text-gray-300 mb-1">
                        Game Idea
                    </label>
                    <textarea
                        id="gameIdea"
                        value={gameIdea}
                        onChange={(e) => onGameIdeaChange(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-48"
                        placeholder="e.g., A game about ordering food at a Spanish restaurant."
                        spellCheck="false"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="targetLang" className="block text-sm font-medium text-gray-300 mb-1">
                            Target Language (2-letter code)
                        </label>
                        <input
                            id="targetLang"
                            type="text"
                            value={targetLang}
                            onChange={(e) => onTargetLangChange(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="es"
                        />
                    </div>
                    <div>
                        <label htmlFor="comfLang" className="block text-sm font-medium text-gray-300 mb-1">
                            Comfortable Language (2-letter code)
                        </label>
                        <input
                            id="comfLang"
                            type="text"
                            value={comfLang}
                            onChange={(e) => onComfLangChange(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="en"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 w-full disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isGenerating ? 'Generating...' : 'Generate & Preview Game'}
            </button>
            {error && (
                <div className="mt-3 text-red-300 bg-red-900/50 p-3 rounded-md text-sm font-mono border border-red-700 overflow-y-auto max-h-32">
                    <p className="font-bold mb-1">Error:</p>
                    <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
            )}
        </div>
    );
};

export default InputPanel;
