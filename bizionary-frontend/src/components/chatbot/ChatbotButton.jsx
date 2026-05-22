import React from 'react';
import { Bot } from 'lucide-react';

const ChatbotButton = ({ onClick }) => {
    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
            {/* Tooltip */}
            <div className="hidden sm:flex flex-col items-end animate-fade-in">
                <div className="bg-textMain text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                    Chat with AI Support
                </div>
                <div className="w-3 h-3 bg-textMain transform rotate-45 -mt-1.5 mr-6"></div>
            </div>

            {/* Button */}
            <button
                onClick={onClick}
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full shadow-2xl hover:shadow-3xl hover:from-primary hover:to-blue-700 transition-all duration-300 text-white hover:scale-110 active:scale-95 group border-2 border-white/20 backdrop-blur-sm"
                aria-label="Open AI Support Chat"
                title="AI Support Chat"
            >
                <Bot className="w-6 h-6 group-hover:animate-bounce" />
                
                {/* Animated ring effect */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse"></div>
            </button>

        </div>
    );
};

export default ChatbotButton;
