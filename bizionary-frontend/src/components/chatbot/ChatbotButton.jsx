import React, { useState } from 'react';
import { Bot } from 'lucide-react';

const ChatbotButton = ({ onClick, className = '' }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className={`relative ${className} pointer-events-auto`}>
            {/* Tooltip - Show dynamically on hover */}
            {isHovered && (
                <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden sm:block bg-textMain text-card text-xs font-semibold px-4 py-2 rounded-xl shadow-xl border border-card/50 whitespace-nowrap animate-in fade-in slide-in-from-right-4 duration-200">
                    Chat with AI Support
                    <div className="w-2 h-2 bg-textMain transform rotate-45 absolute -right-1 top-1/2 -translate-y-1/2 border-r border-t border-card/50"></div>
                </div>
            )}

            {/* Button */}
            <button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex items-center justify-center w-10 h-10 bg-[#2B2620] hover:bg-[#13283E] rounded-full shadow-md hover:shadow-lg hover:shadow-slate-900/30 border-2 border-card/50 transition-all duration-250 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1.5 hover:scale-105 active:scale-95 active:translate-y-0 text-white relative"
                aria-label="Open AI Support Chat"
                title="AI Support Chat"
            >
                <Bot className="w-4.5 h-4.5 group-hover:animate-bounce" />
                
                {/* Animated ring effect */}
                <div className="absolute inset-0 rounded-full border-2 border-[#2B2620]/30 animate-pulse pointer-events-none"></div>
            </button>
        </div>
    );
};

export default ChatbotButton;
