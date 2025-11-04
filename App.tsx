import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { GameData, ParseResult, GameParameter } from './types';
import InputPanel from './components/InputPanel';
import PreviewPanel from './components/PreviewPanel';
import EditPanel from './components/EditPanel';

const parseAiOutput = (rawInput: string): ParseResult => {
  if (!rawInput.trim()) {
    return { gameData: null, gameScript: null, error: null };
  }

  const codeSeparator = '%%BEGINCODE%%';
  const endSeparator = '%%ENDCODE%%';

  const separatorIndex = rawInput.indexOf(codeSeparator);

  if (separatorIndex === -1) {
    return { gameData: null, gameScript: null, error: "Parsing Error: '%%BEGINCODE%%' separator not found." };
  }

  const jsonString = rawInput.substring(0, separatorIndex);
  let gameData: GameData;
  try {
    const cleanedJsonString = jsonString.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
    gameData = JSON.parse(cleanedJsonString);
  } catch (e: any) {
    return { gameData: null, gameScript: null, error: `JSON Parsing Error: ${e.message}` };
  }

  // Validate required fields
  if (!gameData.title || !gameData.description || !gameData.how_to_play || !Array.isArray(gameData.how_to_play)) {
      return { gameData: null, gameScript: null, error: "Parsing Error: The AI response is missing one or more required fields: title, description, how_to_play (must be an array)." };
  }


  const scriptStartIndex = separatorIndex + codeSeparator.length;
  let scriptString = rawInput.substring(scriptStartIndex);

  const endSeparatorIndex = scriptString.indexOf(endSeparator);
  if (endSeparatorIndex !== -1) {
    scriptString = scriptString.substring(0, endSeparatorIndex);
  }

  scriptString = scriptString.replace(/<script.*?>/is, '').replace(/<\/script>/is, '').trim();

  return { gameData, gameScript: scriptString, error: null };
};


const AI_SYSTEM_INSTRUCTION = `You are going to output a JSON and nothing else. What this JSON looks like will adhere to the instructions below. You do not talk to the user, use markdown, or do anything else other than interpret their prompt and make a JSON. AGAIN, DO NOT USE MARKDOWN.

# CONTEXT
Pretend you are an expert educational game designer. You’re going to make a game to be placed on an HTML site. The template for this game – i.e., the area surrounding the container that your game will take place in – has already been created. You are not creating a new one. Instead, you are just creating the Javascript that functions inside that container.

The game may be bilingual. By default, when the user opens the game, the game is in the target language (including the interface). When the user clicks the language button (this is already in the site, do not make it), the game interface and buttons should switch languages to a more comfortable language for the user, but the target language should still be the focus of the game. They may be translating into the target language, but they click a Submit button in their comfortable language.

# YOUR JSON
Your JSON will have the following keys. 
title → A logical title for the game.
description → A short, one-sentence description of the game's objective.
target_lang → Defined by the user. Two letter code for the language, like ‘es’ or ‘en’
comf_language → Defined by the user. Two letter code for the language, like ‘es’ or ‘en’. If the user doesn’t have one, make this “0”.
labels → Separated by commas and slashes, this is what the labels in the game should read. You are going to do these in order and break them down by language. Follow this format, in this order, with these exact words. In this example below, the comfortable language is English (en), and the target language is Spanish (es).

Language/Idioma, Play/Jugar, How to Play/Cómo Jugar, Settings/Configuración, January 1 2000/1 enero 2000, by %user%/de %user%, Made with AINARA/Hecho con AINARA

Notice capitalization, order, and exact terms used. You won’t deviate from them.
how_to_play → An array of strings, where each string is a single rule or step on how to play the game.

After you cap off your JSON, type “%%BEGINCODE%%” on a new line. Then, under this line, begin scripting OUTSIDE of the JSON.

This is what it looks like:
{
…json stuff…
}
%%BEGINCODE%%


<script>
…
</script>

%%ENDCODE%%


# CODING
The playable game area already exists in the HTML and is always the element with id="gameArea". 
YOUR SCRIPT MUST NEVER, UNDER ANY CIRCUMSTANCES, MANIPULATE OR CREATE ELEMENTS OUTSIDE OF document.getElementById('gameArea'). THE HEADER AND FOOTER, INCLUDING LANGUAGE AND SETTINGS BUTTONS, ARE HANDLED EXTERNALLY. DO NOT RECREATE THEM.

Your script must only begin when the event 'gameStart' is dispatched from the window.
The surrounding application will show a standard title screen first. Your script will not run until the user clicks "Play".
Listen for 'window.addEventListener("gameStart", ...)' to initialize your game.

When 'languageToggle' is dispatched, there is no event.detail — your script must internally switch between the target language and the comfortable language and immediately update any visible labels.

### Custom Modals
**NEVER use the built-in browser functions \`alert()\`, \`confirm()\`, or \`prompt()\`**. They are disabled and will break the game. Always create a custom modal for user notifications or choices. Here is how you do it:

\`\`\`javascript
function showModal(title, content, buttons) {
  const gameArea = document.getElementById('gameArea');
  if (!gameArea) return;
  const modalBackdrop = document.createElement('div');
  modalBackdrop.className = 'modal-backdrop';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  modal.innerHTML = \`<h3>\${title}</h3><p>\${content}</p><div class="actions"></div>\`;
  
  const actions = modal.querySelector('.actions');
  buttons.forEach(btnInfo => {
    const button = document.createElement('button');
    button.textContent = btnInfo.text;
    button.className = 'btn ' + (btnInfo.class || 'alt');
    button.onclick = () => {
      modalBackdrop.remove();
      if (btnInfo.handler) btnInfo.handler();
    };
    actions.appendChild(button);
  });
  
  modalBackdrop.appendChild(modal);
  gameArea.appendChild(modalBackdrop);
}

// Example usage:
showModal(
  'Confirm Choice',
  'Are you sure you want to proceed?',
  [
    { text: 'Yes', class: 'primary', handler: () => console.log('Confirmed!') },
    { text: 'No', class: 'alt', handler: () => console.log('Cancelled.') }
  ]
);
\`\`\`


# GRAPHIC DESIGN
These are some code snippets for graphic design. Please reference these when making graphic design choices. You don’t have to use all of them or use them exactly, but when making choices you should rely on them.
For styles, always use the provided CSS variables (e.g., \`var(--color-maintext)\`). NEVER use hardcoded color values like \`#FFFFFF\`, \`#000\`, \`white\`, or \`black\`, as this will break dark mode compatibility.

#### BUTTONS
\`\`\`css
.btn.primary  → background var(--color-primary), color #fff, padding 10px 16px
.btn.alt      → background var(--color-secondary), color #fff, padding 6px 10px
\`\`\`

#### MULTIPLE CHOICE
\`\`\`css
.choice { padding:14px; border:var(--border); border-radius:var(--radius); cursor:pointer; margin-bottom:12px; }
.choice.selected.correct → background var(--color-success), color #fff
.choice.selected.wrong   → background var(--color-danger), color #fff
\`\`\`

# GAME DESIGN REQUIREMENTS
- **Multi-Stage Gameplay:** Simple, single-screen games are not acceptable. Design a gameplay loop with clear progression through multiple steps, levels, or phases. Games that are functionally just a series of multiple-choice questions will be rejected. You MUST incorporate other mechanics, progression, or a narrative.
- **Replayability and Randomization:** Games should not be identical every time they are played. **You MUST shuffle the order of questions, items, or choices to ensure replayability.** Use this standard Fisher-Yates shuffle function:
\`\`\`javascript
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}
// Example usage:
// let myQuestions = [ {q: '...'}, {q: '...'} ];
// let shuffledQuestions = shuffle(myQuestions);
\`\`\`
- **Win/Loss States:** The game must have a clear win condition, a scoring system, or a fail state. A results screen with a "Play Again" button is required.
- **NO TITLE SCREEN:** The application harness creates the title screen. DO NOT create your own. Your script should only initialize the actual gameplay when the 'gameStart' event fires.

# CONTENT RESTRICTIONS
All content must be appropriate for all ages. Do not include references to violence, illegal activities, or adult themes such as alcohol, drugs, or romantic relationships. Keep the tone friendly and educational. 
YOU ARE PROHIBITED FROM MAKING QUIZ GAMES. DO NOT MAKE A SIMPLE QUIZ GAME, EVER. YOU HAVE TO ACTUALLY BE CREATIVE. Quiz elements, like a pop question, ARE allowed, but your entire game can't just be multiple choice.`;

const App: React.FC = () => {
    // State for the generated output
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [gameScript, setGameScript] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // State for the input form
    const [gameIdea, setGameIdea] = useState('');
    const [targetLang, setTargetLang] = useState('es');
    const [comfLang, setComfLang] =useState('en');

    // State for editing
    const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');
    const [editableParameters, setEditableParameters] = useState<GameParameter[] | null>(null);
    const [featureSuggestions, setFeatureSuggestions] = useState<string[] | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // State for API Key
    const [apiKeySelected, setApiKeySelected] = useState(false);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkApiKey();
    }, []);

    const handleApiKeyError = (e: any, context: string) => {
        if (e.message && e.message.includes("Requested entity was not found")) {
            setError(`Your API key appears to be invalid or missing necessary permissions. Please select a valid API key and ensure billing is enabled for your project.`);
            setApiKeySelected(false);
        } else {
            setError(`${context}: ${e.message}`);
        }
    };

    const getEditSuggestions = async (script: string) => {
        if (!script) return;
        setIsSuggesting(true);
        setFeatureSuggestions(null);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Here is a JavaScript game script. Suggest three distinct, creative new features or major changes that a teacher might want to make to improve the game. \n\n<script>${script}</script>`,
                config: {
                    systemInstruction: "You are a creative educational game design assistant. Your task is to suggest three distinct, creative, and high-impact features or changes that would make a game more engaging for students. Present these as a simple JSON object containing a single key 'suggestions' which is an array of strings. Each string should be a concise, user-facing suggestion (1-2 sentences). Do not include any markdown or other text outside the JSON object.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            suggestions: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        }
                    }
                }
            });
            const rawText = response.text;
            let suggestionsData;
            try {
                suggestionsData = JSON.parse(rawText);
            } catch (e) {
                 console.error("Failed to parse suggestions JSON:", rawText);
                 throw new Error("Could not get valid suggestions from the AI.");
            }
            if (suggestionsData && suggestionsData.suggestions) {
                 setFeatureSuggestions(suggestionsData.suggestions.slice(0, 3)); // Ensure only 3
            } else {
                 setFeatureSuggestions([]);
            }
        } catch (e: any) {
            // Don't show this as a blocking error, just fail gracefully
            console.error("Error getting edit suggestions:", e.message);
            setFeatureSuggestions([]);
        } finally {
            setIsSuggesting(false);
        }
    };


    const analyzeGameScript = async (script: string) => {
        setIsAnalyzing(true);
        setEditableParameters(null);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Here is the game script. Please extract the configurable parameters. \n\n<script>${script}</script>`,
                config: {
                    systemInstruction: "You are a helpful assistant that analyzes JavaScript game code and extracts configurable parameters into a JSON format. Identify variables that a non-technical user (like a teacher) might want to change, such as time limits, point values, or lists of items. Do not extract complex logic. For the 'description' of each parameter, use simple, everyday language. For example, instead of 'An array of objects representing quiz questions', say 'The list of questions for the quiz'.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "The exact variable name from the script." },
                                description: { type: Type.STRING, description: "A user-friendly description of what this parameter does." },
                                type: { type: Type.STRING, description: "The data type. Use one of: 'number', 'string', 'boolean', 'array_string'." },
                                value: { type: Type.STRING, description: "The current value of the parameter, represented as a JSON-compatible string (e.g., arrays as '[\"item1\"]', strings as '\"hello\"', numbers as '60')." }
                            },
                            required: ["name", "description", "type", "value"]
                        }
                    }
                }
            });

            const rawText = response.text;
            let params;
            try {
                // Use a regex to find the JSON array, ignoring any leading/trailing text or markdown.
                const match = rawText.match(/(\[[\s\S]*\])/);
                if (!match || !match[0]) {
                    throw new Error("No JSON array found in the AI response.");
                }
                params = JSON.parse(match[0]);
            } catch (e: any) {
                console.error("Failed to parse JSON from AI response:", rawText);
                throw new Error(`Could not extract valid JSON from the AI's analysis. The AI returned an invalid format.`);
            }

            const parsedParams = params.map((p: any) => {
                let parsedValue;
                let valueStr = p.value;
                try {
                    // A common AI error is returning 'some string' instead of "'some string'" for JSON parsing.
                    if (typeof valueStr === 'string' && valueStr.startsWith("'") && valueStr.endsWith("'")) {
                        // Re-wrap with double quotes for JSON compatibility, escaping internal double quotes.
                        valueStr = `"${valueStr.slice(1, -1).replace(/"/g, '\\"')}"`;
                    }
                    parsedValue = JSON.parse(valueStr);
                } catch (e) {
                    console.warn(`Could not JSON parse parameter value: "${p.value}". Using as raw string.`, e);
                    // If parsing fails, it's likely a raw string that wasn't JSON-stringified. Use it directly.
                    parsedValue = p.value;
                }
                let finalType: GameParameter['type'] = p.type;
                if (Array.isArray(parsedValue)) {
                    if (parsedValue.length > 0 && typeof parsedValue[0] === 'object' && parsedValue[0] !== null) {
                         finalType = 'array_object';
                    }
                } else if (typeof parsedValue === 'object' && parsedValue !== null) {
                    finalType = 'object';
                }
                return { ...p, value: parsedValue, type: finalType };
            });
            setEditableParameters(parsedParams);
            await getEditSuggestions(script);
        } catch (e: any) {
            handleApiKeyError(e, 'Error analyzing game script');
            setEditableParameters([]); // Set to empty array on failure to show message
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        if (!gameIdea.trim() || !targetLang.trim() || !comfLang.trim()) {
            setError("Please fill out all fields to generate a game.");
            return;
        }
        
        setIsGenerating(true);
        setError(null);
        setGameData(null);
        setGameScript(null);

        try {
            console.log("Using API Key:", process.env.API_KEY ? "Present" : "Missing");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const userPrompt = `
                Game Idea: ${gameIdea}
                Target Language: ${targetLang}
                Comfortable Language: ${comfLang}
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: userPrompt,
                config: {
                    systemInstruction: AI_SYSTEM_INSTRUCTION,
                },
            });

            const rawInput = response.text;
            const { gameData: parsedData, gameScript: parsedScript, error: parseError } = parseAiOutput(rawInput);
            
            if (parseError) {
                setError(parseError + `\n\nRaw AI Output:\n${rawInput}`);
            } else {
                setGameData(parsedData);
                setGameScript(parsedScript);
                await analyzeGameScript(parsedScript!);
                setActiveTab('edit');
            }

        } catch (e: any) {
            handleApiKeyError(e, 'API Error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEditGame = async (
        updatedNumbers: { [key: string]: number },
        selectedFeatures: string[],
        generalRequest: string,
        isFixing: boolean,
        fixContext: string
    ) => {
        if (!gameScript) return;
        setIsEditing(true);
        setError(null);
    
        let formattedChanges = "";
        let changesRequested = false;

        if (isFixing) {
            formattedChanges += "CRITICAL: The user has indicated 'The game doesn't work.' Please analyze the entire script for bugs, errors, or incomplete logic and prioritize fixing it.\n";
            if (fixContext.trim()) {
                formattedChanges += `User's context on the problem: "${fixContext.trim()}"\n`;
            }
            changesRequested = true;
        }

        if (Object.keys(updatedNumbers).length > 0) {
            formattedChanges += "\nApply these specific parameter changes:\n";
            Object.entries(updatedNumbers).forEach(([key, value]) => {
                formattedChanges += `- Change the value of the variable '${key}' to ${value}.\n`;
            });
            changesRequested = true;
        }

        if (selectedFeatures.length > 0) {
            formattedChanges += "\nImplement the following new features/changes:\n";
            selectedFeatures.forEach(feature => {
                formattedChanges += `- ${feature}\n`;
            });
            changesRequested = true;
        }
    
        if (generalRequest.trim()) {
            formattedChanges += `\nAlso, apply this general request from the user:\n${generalRequest.trim()}`;
            changesRequested = true;
        }
        
        if (!changesRequested) {
            setError("No changes were requested.");
            setIsEditing(false);
            return;
        }
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Original Script:\n${gameScript}\n\nPlease apply the following changes and instructions:\n${formattedChanges}`,
                config: {
                    systemInstruction: "You are an expert JavaScript programmer who modifies game scripts based on user requests. You will be given the original script and a set of changes. Your task is to apply these changes and return only the full, updated JavaScript code. Do not include any markdown, explanations, or ```javascript wrappers. Your output must be only the raw script content. If asked to fix the game, carefully review the code for errors."
                }
            });
    
            const newScript = response.text.replace(/```javascript\n?/, '').replace(/```\n?$/, '').trim();
            setGameScript(newScript);
            await analyzeGameScript(newScript);
        } catch (e: any) {
            handleApiKeyError(e, 'Error editing game');
        } finally {
            setIsEditing(false);
        }
    };
    
    // const handleSelectKey = async () => {
    //     if (window.aistudio) {
    //         await window.aistudio.openSelectKey();
    //         // Assume success to avoid race condition and re-render
    //         setApiKeySelected(true);
    //         setError(null); // Clear previous API key errors
    //     }
    // };

    // if (!apiKeySelected) {
    //     return (
    //         <div className="bg-gray-800 text-gray-100 min-h-screen font-sans flex flex-col items-center justify-center p-4">
    //              <div className="bg-gray-900 rounded-lg p-8 shadow-xl text-center max-w-lg">
    //                 <h1 className="text-2xl font-bold text-blue-400 mb-4">
    //                     API Key Required
    //                 </h1>
    //                 <p className="text-gray-300 mb-6">
    //                     To use the AI Game Generator, you need to select a Gemini API key. Please ensure your project has billing is enabled.
    //                 </p>
    //                 <button
    //                     onClick={handleSelectKey}
    //                     className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105"
    //                 >
    //                     Select API Key
    //                 </button>
    //                 <p className="text-xs text-gray-500 mt-4">
    //                     For more information on billing, visit{' '}
    //                     <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
    //                         ai.google.dev/gemini-api/docs/billing
    //                     </a>.
    //                 </p>
    //                 {error && (
    //                     <div className="mt-4 text-red-300 bg-red-900/50 p-3 rounded-md text-sm font-mono border border-red-700 text-left">
    //                          <pre className="whitespace-pre-wrap">{error}</pre>
    //                     </div>
    //                 )}
    //              </div>
    //         </div>
    //     );
    // }


    return (
        <div className="bg-gray-800 text-gray-100 min-h-screen font-sans flex flex-col">
            <header className="bg-gray-900 shadow-lg p-4">
                <h1 className="text-2xl font-bold text-center text-blue-400">
                    La Arcada de Foca
                </h1>
            </header>
            <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-[calc(100vh-72px)]">
                <div className="flex flex-col bg-gray-900 rounded-lg p-4 shadow-xl h-full">
                    <div className="flex border-b border-gray-700 mb-4">
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`py-2 px-4 text-sm font-medium transition-colors ${
                                activeTab === 'generate'
                                    ? 'border-b-2 border-blue-400 text-blue-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Generate Game
                        </button>
                        <button
                            onClick={() => setActiveTab('edit')}
                            disabled={!gameScript}
                            className={`py-2 px-4 text-sm font-medium transition-colors ${
                                activeTab === 'edit'
                                    ? 'border-b-2 border-blue-400 text-blue-400'
                                    : 'text-gray-400 hover:text-white'
                            } disabled:text-gray-600 disabled:cursor-not-allowed`}
                        >
                            Edit & Fix
                        </button>
                    </div>

                    <div className="flex-grow overflow-hidden relative">
                         {activeTab === 'generate' ? (
                            <InputPanel
                                gameIdea={gameIdea}
                                onGameIdeaChange={setGameIdea}
                                targetLang={targetLang}
                                onTargetLangChange={setTargetLang}
                                comfLang={comfLang}
                                onComfLangChange={setComfLang}
                                onGenerate={handleGenerate}
                                isGenerating={isGenerating}
                                error={error}
                            />
                        ) : (
                            gameScript ? (
                                <EditPanel
                                    parameters={editableParameters}
                                    featureSuggestions={featureSuggestions}
                                    isSuggesting={isSuggesting}
                                    onEdit={handleEditGame}
                                    isAnalyzing={isAnalyzing}
                                    isEditing={isEditing}
                                    error={error}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <p>Generate a game first to enable editing and fixing.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                <PreviewPanel
                    gameData={gameData}
                    gameScript={gameScript}
                />
            </main>
        </div>
    );
};

export default App;
