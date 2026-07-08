import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatbotModal from '../chatbot/ChatbotModal';
import AIInsightsWidget from '../common/AIInsightsWidget';
import { ToastContainer } from '../ui/Toast';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';
import { Zap, Plus, Bot } from 'lucide-react';

const LayoutShell = () => {
    const { isCollapsed } = useSidebar();
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isInsightsOpen, setIsInsightsOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const isChatbotRoute = location.pathname.startsWith('/chatbot');

    return (
        <div className="flex h-screen bg-page overflow-hidden transition-colors duration-300">

            {/* Persistent Sidebar */}
            <Sidebar />

            {/* Content column — shifts right to make room for sidebar on desktop */}
            <div
                className={`
                    flex flex-col flex-1 min-w-0 overflow-hidden
                    transition-[margin-left] duration-300 ease-in-out
                    ${isCollapsed ? 'lg:ml-0' : 'lg:ml-60'}
                `}
            >
                <Topbar />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
                    <Outlet />
                </main>
            </div>

            {/* Peeking Waving AI Widgets on the right border */}
            <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 print:hidden">
                {/* AI Chatbot Button */}
                {!isChatbotRoute && (
                    <button
                        onClick={() => setIsChatbotOpen(true)}
                        className="bg-gradient-to-l from-accent/95 via-accent to-teal-500 text-card pl-2.5 pr-2 py-3 rounded-l-xl shadow-2xl border-l border-y border-white/10 flex flex-col items-center gap-1.5 cursor-pointer translate-x-1.5 hover:translate-x-0 hover:pl-3 hover:pr-2.5 transition-all duration-300 ease-out group"
                        aria-label="AI Chatbot"
                        title="Chat with AI Assistant"
                    >
                        <div className="relative">
                            <Bot className="w-4 h-4 group-hover:animate-bounce text-emerald-300 pointer-events-none" />
                            {/* Notification bubble */}
                            <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                        </div>
                        <span className="text-[8px] font-black tracking-wider uppercase [writing-mode:vertical-lr] select-none text-emerald-50">
                            AI Chat
                        </span>
                    </button>
                )}

                {/* AI Insights Button */}
                <button
                    onClick={() => setIsInsightsOpen(true)}
                    className="bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-550 text-card pl-2.5 pr-2 py-3 rounded-l-xl shadow-2xl border-l border-y border-white/10 flex flex-col items-center gap-1.5 cursor-pointer translate-x-1.5 hover:translate-x-0 hover:pl-3 hover:pr-2.5 transition-all duration-300 ease-out group"
                    aria-label="AI Insights"
                    title="Open AI Insights"
                >
                    <Zap className="w-4 h-4 group-hover:scale-110 text-emerald-250 pointer-events-none transition-transform" />
                    <span className="text-[8px] font-black tracking-wider uppercase [writing-mode:vertical-lr] select-none text-emerald-50">
                        Insights
                    </span>
                </button>
            </div>

            {/* Global overlays */}
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
            <AIInsightsWidget isOpen={isInsightsOpen} onClose={() => setIsInsightsOpen(false)} />
            <ToastContainer />
        </div>
    );
};

const DashboardLayout = () => (
    <SidebarProvider>
        <LayoutShell />
    </SidebarProvider>
);

export default DashboardLayout;
