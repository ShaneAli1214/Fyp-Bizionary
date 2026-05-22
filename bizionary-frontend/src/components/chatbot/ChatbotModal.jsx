import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { chatbotApi } from '../../services/chatbotApi';

const ChatbotModal = ({ isOpen, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([
        {
            sender: 'assistant',
            text: 'Hello! 👋 I\'m your AI Support Assistant. I\'m here to help you with any questions about orders, products, sales, inventory, or account workflows. What can I assist you with today?',
        },
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const messageListRef = useRef(null);

    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = async () => {
        if (!prompt.trim()) {
            return;
        }

        setError('');
        const userMessage = prompt.trim();
        const nextMessages = [...messages, { sender: 'user', text: userMessage }];
        setMessages(nextMessages);
        setPrompt('');
        setLoading(true);

        try {
            const history = messages.map((message) => ({
                role: message.sender === 'user' ? 'user' : 'assistant',
                content: message.text,
            }));
            const response = await chatbotApi.query(userMessage, history);
            const reply = response.data?.data?.response || 'I could not generate a response right now.';
            setMessages((prev) => [...prev, { sender: 'assistant', text: reply }]);
        } catch (sendError) {
            console.error(sendError);
            setError(
                sendError.response?.data?.error || 'Service unavailable. Please try again later.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-3 md:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-50 w-full max-w-[20rem] rounded-3xl bg-white shadow-2xl border border-gray-200 flex flex-col max-h-[500px] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-primary via-blue-500 to-primary text-white rounded-t-3xl">
                    <div>
                        <h2 className="text-sm font-bold">ASK YOUR QUERIES HERE</h2>
                        <p className="text-[11px] text-blue-100 mt-0.5">Powered by AI • Always Available</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 transition rounded-lg hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div
                    ref={messageListRef}
                    className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-slate-50 to-white"
                >
                    {messages.map((message, index) => (
                        <div
                            key={`${message.sender}-${index}`}
                            className={`rounded-2xl p-3 shadow-sm ${
                                message.sender === 'user'
                                    ? 'ml-auto max-w-[85%] bg-primary/15 text-textMain border border-primary/20'
                                    : 'mr-auto max-w-[85%] bg-white text-textMain border border-gray-100'
                            }`}
                        >
                            <div className="text-xs font-semibold text-textMuted mb-1.5 capitalize opacity-70">
                                {message.sender === 'user' ? '👤 You' : '🤖 AI Assistant'}
                            </div>
                            <div className="text-xs leading-5 whitespace-pre-wrap">{message.text}</div>
                        </div>
                    ))}
                    {loading && (
                        <div className="mr-auto max-w-[85%] rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
                            <div className="text-xs font-semibold text-textMuted mb-1.5 opacity-70">🤖 AI Assistant</div>
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 bg-white p-3 space-y-2 rounded-b-3xl">
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your question here..."
                        className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-xs text-textMain shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white resize-none transition"
                        rows="2"
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-blue-600 px-3 py-2.5 text-xs font-bold text-white transition hover:from-primary hover:to-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 active:scale-95"
                    >
                        {loading ? (
                            <>
                                <span className="inline-block animate-spin mr-2">⏳</span>
                                Thinking...
                            </>
                        ) : (
                            <>
                                <span className="mr-2">📤</span>
                                Send
                            </>
                        )}
                    </button>
                    {error && <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default ChatbotModal;
