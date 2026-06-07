import React, { useState } from 'react';
import { Bot } from 'lucide-react';

const ChatbotButton = ({ onClick, className = '' }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className={`fixed bottom-6 right-6 z-40 flex-col items-end gap-3 ${className}`}>
            {/* Tooltip - Show dynamically on hover */}
            {isHovered && (
                <div className="hidden sm:flex flex-col items-end animate-fade-in transition-all duration-300">
                    <div className="bg-textMain text-white text-xs font-semibold px-4.5 py-2 rounded-full shadow-xl whitespace-nowrap border border-white/10">
                        Chat with AI Support
                    </div>
                    <div className="w-3 h-3 bg-textMain transform rotate-45 -mt-1.5 mr-6 border-r border-b border-white/10"></div>
                </div>
            )}

            {/* Button */}
            <button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#1C3A5A] to-[#2B527E] rounded-full shadow-2xl hover:shadow-[0_0_15px_rgba(28,58,90,0.6)] hover:from-[#13283E] hover:to-[#1C3A5A] transition-all duration-300 ease-in-out text-white hover:scale-105 active:scale-95 group border-2 border-white/20 backdrop-blur-sm relative"
                aria-label="Open AI Support Chat"
                title="AI Support Chat"
            >
                <Bot className="w-6 h-6 group-hover:animate-bounce" />
                
                {/* Animated ring effect */}
                <div className="absolute inset-0 rounded-full border-2 border-[#1C3A5A]/30 animate-pulse pointer-events-none"></div>
            </button>
        </div>
    );
};

export default ChatbotButton;
