import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { Message, AinaraMessage } from '../types';

interface ChatPanelProps {
    handleApiKeyError: (e: any, context: string) => void;
    chat: Chat | null;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    onIdeaImport: (idea: string) => void;
}

// New component for rendering basic markdown
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const toHtml = (markdown: string) => {
    // Escape HTML to prevent XSS, we'll re-insert HTML tags for markdown
    let html = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
      
    // Process blocks (paragraphs and lists) separated by double newlines
    const blocks = html.split('\n\n');
    const htmlBlocks = blocks.map(block => {
      if (!block.trim()) return '';

      // **bold**
      block = block.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // *italic*
      block = block.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // [link](url)
      block = block.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');

      // Unordered list
      if (block.match(/^\s*[\-\*]\s/)) {
        const items = block.split('\n').map(item => `<li class="ml-4">${item.replace(/^\s*[\-\*]\s/, '')}</li>`).join('');
        return `<ul class="list-disc list-inside space-y-1">${items}</ul>`;
      }
      // Ordered list
      if (block.match(/^\s*\d+\.\s/)) {
        const items = block.split('\n').map(item => `<li class="ml-4">${item.replace(/^\s*\d+\.\s/, '')}</li>`).join('');
        return `<ol class="list-decimal list-inside space-y-1">${items}</ol>`;
      }
      // Paragraphs with line breaks
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    });

    return htmlBlocks.join('');
  };

  return (
    <div 
      className="font-sans space-y-4"
      dangerouslySetInnerHTML={{ __html: toHtml(text) }} 
    />
  );
};


const ChatPanel: React.FC<ChatPanelProps> = ({ handleApiKeyError, chat, messages, setMessages, onIdeaImport }) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);
    
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading || !chat) return;

        const userMessage = { role: 'user' as const, content: inputValue };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputValue;
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await chat.sendMessage({ message: currentInput });
            const rawText = response.text.trim();
            
            let parsedResponse: Omit<AinaraMessage, 'role'>;
            try {
                // More robust JSON parsing: find the JSON object within the response text.
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch && jsonMatch[0]) {
                    parsedResponse = JSON.parse(jsonMatch[0]);
                } else {
                    // If no JSON object is found, treat the whole response as an error.
                     throw new Error("No valid JSON object found in the AI response.");
                }
            } catch (e) {
                parsedResponse = {
                    header: "Response Error",
                    body: `The AI returned a response that was not in the expected JSON format.\n\nRaw response:\n${rawText}`,
                    footer: "Please try rephrasing your message.",
                    language: 'en'
                };
            }
            
            const ainaraMessage: AinaraMessage = { role: 'model', ...parsedResponse };
            setMessages(prev => [...prev, ainaraMessage]);

        } catch (e: any) {
            handleApiKeyError(e, "Error sending message to AINARA");
            const errorMessage: AinaraMessage = {
                role: 'model',
                header: "API Error",
                body: "Sorry, I couldn't process your request right now.",
                footer: e.message,
                language: 'en'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col">
            <div className="flex-shrink-0 flex justify-end items-center px-4 pt-2">
                 {messages.length > 0 && (
                    <button 
                        onClick={() => setMessages([])} 
                        className="text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded p-1 transition-colors flex items-center gap-1" 
                        title="Clear Chat History"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear
                    </button>
                 )}
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4 min-h-0">
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                        <img src="isotipo.png" alt="AINARA Logo" className="w-24 h-24 mb-4 rounded-full" />
                        <h2 className="text-xl font-medium">How can I help?</h2>
                    </div>
                )}
                {messages.map((msg, index) => {
                    if (msg.role === 'user') {
                        return (
                            <div key={index} className="flex justify-end">
                                <div className="bg-blue-600 text-white rounded-lg py-2 px-4 max-w-lg shadow-md">
                                    {msg.content}
                                </div>
                            </div>
                        );
                    } else { // role === 'model'
                        const ideaMarker = '&&IDEA&&';
                        const bodyParts = msg.body.split(ideaMarker);

                        const handleCopy = () => {
                            navigator.clipboard.writeText(msg.body.replace(/&&IDEA&&/g, '')).catch(err => console.error('Failed to copy text: ', err));
                        };

                        return (
                            <div key={index} className="flex justify-start">
                                <div className="flex flex-col gap-1 items-start max-w-lg">
                                    {msg.header && (
                                        <div className="bg-gray-700 text-gray-200 rounded-lg py-2 px-4 shadow-md animate-fade-in">
                                            {msg.header}
                                        </div>
                                    )}
                                    {msg.body && (
                                        <div className="relative group bg-gray-700 text-gray-200 rounded-lg py-2 px-4 shadow-md animate-fade-in" style={{animationDelay: '100ms'}}>
                                            <button onClick={handleCopy} className="absolute top-1 right-1 p-1 rounded bg-gray-800/50 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Copy body">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            </button>
                                            
                                            {bodyParts.map((part, i) => {
                                                const isLastPart = i === bodyParts.length - 1;
                                                
                                                // The actual idea text is the trimmed part, with any markdown list markers removed.
                                                const ideaText = part.trim().replace(/^\s*([*\-]\s*|\d+\.\s*)/, '');
                                                
                                                // Show a button only if this isn't the last part and the cleaned idea text has content.
                                                const showButton = !isLastPart && ideaText;
                                                
                                                // Don't render anything for an empty trailing part.
                                                if (!part.trim() && isLastPart) return null;

                                                return (
                                                    <div key={i}>
                                                        <MarkdownRenderer text={part} />
                                                        {showButton && (
                                                            <div className="pt-3 mt-2 border-t border-gray-600/50">
                                                                <button
                                                                    onClick={() => onIdeaImport(ideaText)}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-1 px-3 rounded-lg transition-all flex items-center gap-2"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.621.206 1.213.448 1.77.722A11.986 11.986 0 0118 10.5c.34.183.653.386.944.612m-6.27-5.176a11.985 11.985 0 015.658 5.658m-5.658-5.658A11.982 11.982 0 005.05 9.42L9.25 5.221a3 3 0 01.5-.217z" />
                                                                    </svg>
                                                                    Use This Idea
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {msg.footer && (
                                        <div className="bg-gray-700 text-gray-200 rounded-lg py-2 px-4 shadow-md animate-fade-in" style={{animationDelay: '200ms'}}>
                                            {msg.footer}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }
                })}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 text-gray-200 rounded-lg py-2 px-4 shadow-md">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700 flex-shrink-0">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
                        disabled={isLoading || !chat}
                        className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        aria-label="Chat input"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !inputValue.trim() || !chat}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;