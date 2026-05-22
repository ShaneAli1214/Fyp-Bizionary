import React, { useState } from 'react';
import { Bot, Send } from 'lucide-react';

const AIChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "How can I help you today, Ali?", sender: "bot" }
    ]);
    const [inputValue, setInputValue] = useState("");

    const toggleChat = () => setIsOpen(!isOpen);

    const presetQuestions = [
        "What's my revenue forecast for next week?",
        "Show me top selling items."
    ];

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Add User Message
        const newMsg = { id: Date.now(), text: inputValue, sender: "user" };
        setMessages(prev => [...prev, newMsg]);
        setInputValue("");

        // Mock Bot Response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "I am analyzing your data to answer that. (Mock Response)",
                sender: "bot"
            }]);
        }, 1000);
    };

    const handlePresetClick = (question) => {
        setInputValue(question);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            {/* Chat Popover */}
            <div
                className={`absolute bottom-full right-0 mb-4 w-72 sm:w-80 bg-white rounded-xl border border-gray-100 shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                    }`}
            >
                {/* Header Phase 5 AI Gradient */}
                <div className="ai-gradient p-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Bizzionary AI</p>
                            <p className="text-[10px] opacity-90">Always here to help</p>
                        </div>
                    </div>
                </div>

                {/* Chat Body */}
                <div className="p-4 flex flex-col h-72">

                    {/* Message Area */}
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.sender === 'user'
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-gray-100 text-textMain rounded-bl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Presets if only 1 message (the greeting) */}
                    {messages.length === 1 && (
                        <div className="space-y-2 mb-4 shrink-0">
                            <p className="text-[11px] text-textMuted">Try asking:</p>
                            {presetQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handlePresetClick(q)}
                                    className="w-full text-left p-2 rounded-lg bg-slate-50 text-[11px] text-textMain hover:bg-slate-100 transition-colors border border-slate-100"
                                >
                                    "{q}"
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="flex gap-2 items-center shrink-0">
                        <input
                            className="flex-1 bg-slate-100 border-none rounded-lg text-xs py-2 px-3 focus:ring-1 focus:ring-primary outline-none text-textMain placeholder-textMuted"
                            placeholder="Type a message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primaryDark transition-colors shrink-0 disabled:opacity-50"
                            disabled={!inputValue.trim()}
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Glowing Floating Button */}
            <button
                onClick={toggleChat}
                className="w-14 h-14 ai-gradient rounded-full text-white shadow-xl ai-glow flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            >
                <Bot className="w-7 h-7" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-success border-2 border-white rounded-full"></div>
            </button>
        </div>
    );
};

export default AIChatbotWidget;
