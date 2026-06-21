import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatbotModal from '../chatbot/ChatbotModal';
import AIInsightsWidget from '../common/AIInsightsWidget';
import { Zap, Plus, Bot } from 'lucide-react';

const DashboardLayout = () => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isInsightsOpen, setIsInsightsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const isChatbotRoute = location.pathname.startsWith('/chatbot');

    return (
        <div className="relative flex h-screen bg-background dark:bg-[#0b1120] overflow-hidden transition-colors duration-300 flex-col md:flex-col lg:flex-col">
            {/* Mobile Sidebar Drawer Overlay & Sidebar */}
            <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
                <Navbar onToggleSidebar={() => setIsMobileSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 pt-10 md:p-6 md:pt-12 lg:p-8 lg:pt-16 relative">
                    <Outlet />
                </main>
            </div>

            {/* Floating Action Menu */}
            <div 
                className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none print:hidden"
                onMouseEnter={() => setIsMenuOpen(true)}
                onMouseLeave={() => setIsMenuOpen(false)}
            >
                {/* Sub-menu options */}
                <div className={`flex flex-col items-end gap-2 mb-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isMenuOpen 
                        ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' 
                        : 'opacity-0 translate-y-4 pointer-events-none scale-95'
                }`}>
                    {/* Option 1: AI Insights */}
                    <div className="relative flex items-center group pointer-events-auto">
                        {/* Tooltip Label */}
                        <div className="absolute right-9 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] md:text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-800/10 dark:border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none mr-2">
                            AI Insights
                        </div>
                        <button
                            onClick={() => {
                                setIsInsightsOpen(true);
                                setIsMenuOpen(false);
                            }}
                            className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-md hover:shadow-lg hover:shadow-emerald-500/30 border-2 border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 cursor-pointer"
                            aria-label="AI Insights"
                            title="AI Insights"
                        >
                            <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-300 animate-pulse pointer-events-none" />
                        </button>
                    </div>

                    {/* Option 2: AI Chatbot */}
                    {!isChatbotRoute && (
                        <div className="relative flex items-center group pointer-events-auto">
                            {/* Tooltip Label */}
                            <div className="absolute right-9 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] md:text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-800/10 dark:border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none mr-2">
                                AI Chatbot
                            </div>
                            <button
                                onClick={() => {
                                    setIsChatbotOpen(true);
                                    setIsMenuOpen(false);
                                }}
                                className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-[#1C3A5A] to-[#2B527E] text-white rounded-full shadow-md hover:shadow-lg hover:shadow-slate-900/30 border-2 border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 cursor-pointer"
                                aria-label="AI Chatbot"
                                title="AI Chatbot"
                            >
                                <Bot className="w-3.5 h-3.5 md:w-4 md:h-4 pointer-events-none" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Main FAB Plus (+) Button */}
                <button
                    onClick={() => setIsMenuOpen(prev => !prev)}
                    className="flex items-center justify-center w-8 h-8 md:w-9.5 md:h-9.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl border-2 border-white/20 pointer-events-auto transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-105 active:scale-95 cursor-pointer relative"
                    aria-label="Toggle Quick AI Options"
                >
                    <Plus className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 ${isMenuOpen ? 'rotate-45 text-emerald-100' : 'text-white'}`} />
                </button>
            </div>

            {/* Modals & Panels */}
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
            <AIInsightsWidget isOpen={isInsightsOpen} onClose={() => setIsInsightsOpen(false)} />
        </div>
    );
};

export default DashboardLayout;
