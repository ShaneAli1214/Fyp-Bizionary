import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatbotButton from '../chatbot/ChatbotButton';
import ChatbotModal from '../chatbot/ChatbotModal';
import AIInsightsWidget from '../common/AIInsightsWidget';

const DashboardLayout = () => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);

    return (
        <div className="flex h-screen bg-background dark:bg-[#0b1120] overflow-hidden relative transition-colors duration-300">
            <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Navbar onToggleSidebar={() => setIsMobileSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <Outlet />
                </main>
            </div>

            {/* Chatbot Button and Modal */}
            <ChatbotButton onClick={() => setIsChatbotOpen(true)} />
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />

            {/* AI Insights Widget */}
            <AIInsightsWidget />
        </div>
    );
};

export default DashboardLayout;
