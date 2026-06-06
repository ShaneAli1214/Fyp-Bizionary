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

            {/* Chatbot Button and Modal */}
            <ChatbotButton onClick={() => setIsChatbotOpen(true)} />
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />

            {/* AI Insights Widget */}
            <AIInsightsWidget />
        </div>
    );
};

export default DashboardLayout;
