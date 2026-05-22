import React, { useState, useRef, useEffect } from 'react';
import { chatbotApi } from '../../services/chatbotApi';

const Chatbot = () => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([
        {
            sender: 'assistant',
            text: 'Hello! I am your customer support AI assistant. Ask me any question about orders, products, sales, or account workflows.',
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

    return (
        <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                <h1 className="text-2xl font-semibold text-textMain">AI Customer Support</h1>
                <p className="mt-2 text-sm text-textMuted">
                    Ask customer questions and get instant answers that help you handle requests faster.
                </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
                <div
                    ref={messageListRef}
                    className="max-h-[60vh] space-y-4 overflow-y-auto rounded-3xl border border-slate-100 bg-slate-50 p-4"
                >
                    {messages.map((message, index) => (
                        <div
                            key={`${message.sender}-${index}`}
                            className={`rounded-3xl p-4 shadow-sm ${
                                message.sender === 'user'
                                    ? 'ml-auto max-w-[75%] bg-primary/10 text-textMain'
                                    : 'mr-auto max-w-[75%] bg-white text-textMain'
                            }`}
                        >
                            <div className="text-sm font-medium text-textMuted mb-2 capitalize">
                                {message.sender === 'user' ? 'You' : 'Assistant'}
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-6">{message.text}</div>
                        </div>
                    ))}
                    {loading && (
                        <div className="mr-auto max-w-[75%] rounded-3xl bg-white p-4 shadow-sm">
                            <div className="text-sm font-medium text-textMuted mb-2">Assistant</div>
                            <div className="text-sm leading-6 text-textMuted">Typing...</div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your customer query here..."
                        className="min-h-[104px] flex-1 rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-textMain shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-3xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>

                {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            </div>
        </div>
    );
};

export default Chatbot;
