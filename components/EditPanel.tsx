import React, { useState, useEffect } from 'react';
import type { GameParameter } from '../types';

interface EditPanelProps {
    parameters: GameParameter[] | null;
    featureSuggestions: string[] | null;
    isSuggesting: boolean;
    onEdit: (
        updatedNumbers: { [key: string]: number },
        selectedFeatures: string[],
        generalRequest: string,
        isFixing: boolean,
        customFixText: string,
        selectedFixCheckboxes: string[]
    ) => void;
    isAnalyzing: boolean;
    isEditing: boolean;
    error: string | null;
}

const EditPanel: React.FC<EditPanelProps> = ({ 
    parameters, 
    featureSuggestions,
    isSuggesting,
    onEdit, 
    isAnalyzing, 
    isEditing, 
    error 
}) => {
    const [numberParams, setNumberParams] = useState<GameParameter[]>([]);
    const [formValues, setFormValues] = useState<{ [key: string]: number | string }>({});
    const [initialFormValues, setInitialFormValues] = useState<{ [key: string]: number | string }>({});

    const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
    const [generalRequest, setGeneralRequest] = useState('');
    
    const [isFixRequest, setIsFixRequest] = useState(false);
    const [customFixText, setCustomFixText] = useState('');
    const [selectedFixCheckboxes, setSelectedFixCheckboxes] = useState<string[]>([]);

    const fixCheckOptions = [
        "...and there's just a blank white screen on startup",
        "...and I can't get past an in-game menu",
        "...and the buttons don't work",
        "...and things are falling outside the center container (box in the center)",
        "...and the graphic design colors are completely off or inaccessible",
        "...and the content is inappropriate"
    ];


    useEffect(() => {
        if (parameters) {
            // Find up to 3 number parameters for quick edits
            const nums = parameters.filter(p => p.type === 'number').slice(0, 3);
            setNumberParams(nums);
            
            const initialVals: { [key: string]: number | string } = {};
            nums.forEach(p => {
                initialVals[p.name] = p.value;
            });

            setInitialFormValues(initialVals);
            setFormValues(initialVals);
            
            // Reset other fields
            setGeneralRequest('');
            setSelectedSuggestions([]);
            setIsFixRequest(false);
            setCustomFixText('');
            setSelectedFixCheckboxes([]);
        }
    }, [parameters]);

    const handleInputChange = (name: string, value: string) => {
        // Allow empty string for temporary state, but convert to number on submit
        const numValue = value === '' ? '' : Number(value);
        if (!isNaN(Number(numValue))) {
            setFormValues(prev => ({ ...prev, [name]: numValue }));
        }
    };
    
    const handleSuggestionToggle = (suggestion: string) => {
        setSelectedSuggestions(prev => 
            prev.includes(suggestion) 
                ? prev.filter(s => s !== suggestion)
                : [...prev, suggestion]
        );
    };

    const handleFixCheckboxChange = (option: string) => {
        setSelectedFixCheckboxes(prev => 
            prev.includes(option)
                ? prev.filter(s => s !== option)
                : [...prev, option]
        );
    };

    const handleSubmit = () => {
        const updatedNumbers: { [key: string]: number } = {};
        Object.keys(formValues).forEach(key => {
            const currentValue = formValues[key];
            const initialValue = initialFormValues[key];
            // Check if it's a valid number and has changed
            if (currentValue !== '' && !isNaN(Number(currentValue)) && currentValue !== initialValue) {
                updatedNumbers[key] = Number(currentValue);
            }
        });

        onEdit(updatedNumbers, selectedSuggestions, generalRequest, isFixRequest, customFixText, selectedFixCheckboxes);
    };
    
    if (isAnalyzing) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                    <svg className="animate-spin h-8 w-8 text-blue-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p>Scanning game and generating ideas...</p>
                </div>
            </div>
        );
    }
    
    const SuggestionCard = ({ suggestion }: { suggestion: string }) => {
        const isSelected = selectedSuggestions.includes(suggestion);
        return (
            <div 
                onClick={() => handleSuggestionToggle(suggestion)}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-blue-900/50 border-blue-500 ring-2 ring-blue-500' : 'bg-gray-800 border-gray-700 hover:border-blue-600'}`}
            >
                <div className="flex items-start gap-3">
                    <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-400' : 'border-gray-500'}`}>
                       {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                    <p className="text-sm text-gray-200">{suggestion}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto pr-2 space-y-6 pb-4">
                <h2 className="text-xl font-bold text-blue-400">Edit & Fix Game</h2>
                
                {/* FIX REQUEST */}
                <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="fixRequest" checked={isFixRequest} onChange={e => setIsFixRequest(e.target.checked)} className="h-5 w-5 text-yellow-500 bg-gray-800 border-gray-600 rounded focus:ring-yellow-500 focus:ring-offset-gray-900" />
                        <label htmlFor="fixRequest" className="text-sm font-medium text-yellow-300">The game doesn't work</label>
                    </div>
                    {isFixRequest && (
                        <>
                            <textarea
                                value={customFixText}
                                onChange={(e) => setCustomFixText(e.target.value)}
                                className="w-full bg-gray-900 border border-yellow-700 rounded-md p-2 text-sm font-mono focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-none h-20"
                                placeholder="Optional: Describe what's wrong..."
                            />
                            <div className="pt-2 space-y-1">
                                {fixCheckOptions.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`fix-option-${index}`}
                                            checked={selectedFixCheckboxes.includes(option)}
                                            onChange={() => handleFixCheckboxChange(option)}
                                            className="h-4 w-4 text-yellow-500 bg-gray-800 border-gray-600 rounded focus:ring-yellow-500 focus:ring-offset-gray-900 cursor-pointer"
                                        />
                                        <label htmlFor={`fix-option-${index}`} className="text-sm font-normal text-gray-400 cursor-pointer">{option}</label>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* QUICK EDITS */}
                {numberParams.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">Quick Edits</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {numberParams.map(param => (
                                <div key={param.name}>
                                    <label className="block text-xs font-medium text-gray-400 mb-1" title={param.name}>{param.description}</label>
                                    <input 
                                        type="number" 
                                        value={formValues[param.name] ?? ''}
                                        onChange={e => handleInputChange(param.name, e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FEATURE IDEAS */}
                <div>
                     <h3 className="text-lg font-semibold text-gray-200 mb-2">Feature Ideas</h3>
                    {isSuggesting && <div className="text-gray-400 text-sm">Generating ideas...</div>}
                    {featureSuggestions && featureSuggestions.length > 0 && (
                         <div className="space-y-3">
                            {featureSuggestions.map((suggestion, index) => (
                               <SuggestionCard key={index} suggestion={suggestion} />
                            ))}
                         </div>
                    )}
                     {featureSuggestions && featureSuggestions.length === 0 && !isSuggesting && <div className="text-gray-400 text-sm">Couldn't generate specific feature ideas for this game.</div>}
                </div>

                {/* GENERAL REQUEST */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">Write Your Own Edit</h3>
                    <textarea
                        value={generalRequest}
                        onChange={(e) => setGeneralRequest(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-28"
                        placeholder="e.g., Make the game harder by adding more questions, or change the visual theme to be about space."
                    />
                </div>
            </div>

            <div className="flex-shrink-0 space-y-2 pt-4 border-t border-gray-700">
                <button onClick={handleSubmit} disabled={isEditing || isAnalyzing} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isEditing ? 'Applying...' : 'Make Changes'}
                </button>
                {error && (
                    <div className="text-red-300 bg-red-900/50 p-3 rounded-md text-sm font-mono border border-red-700 overflow-y-auto max-h-32">
                        <p className="font-bold mb-1">Error:</p>
                        <pre className="whitespace-pre-wrap">{error}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditPanel;
