
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { Message, AinaraMessage } from '../types';

interface ChatPanelProps {
    handleApiKeyError: (e: any, context: string) => void;
    chat: Chat | null;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ handleApiKeyError, chat, messages, setMessages }) => {
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
                const cleanedJson = rawText.replace(/```json\n?/s, '').replace(/```\n?$/s, '');
                parsedResponse = JSON.parse(cleanedJson);
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
        <div className="flex flex-col h-full">
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
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
                        const handleCopy = () => {
                            navigator.clipboard.writeText(msg.body).catch(err => console.error('Failed to copy text: ', err));
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
                                            <pre className="whitespace-pre-wrap font-sans">{msg.body}</pre>
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