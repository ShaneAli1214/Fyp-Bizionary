import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
    X, Bot, Send, Mic, MicOff, AlertCircle, RefreshCw, 
    Trash2, HelpCircle, Volume2
} from 'lucide-react';
import { chatbotApi } from '../../services/chatbotApi';
import api from '../../services/api';

const ChatbotModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('bizionary_chatbot_modal_history');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved chatbot modal history', e);
            }
        }
        return [
            {
                sender: 'assistant',
                text: 'Hello! 👋 I\'m your AI Support Assistant. I can help with orders, stock levels, sales analytics, or erp guides. Ask me anything or select a shortcut below!',
            },
        ];
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [demoMode, setDemoMode] = useState(false);
    const [isKeyConfigured, setIsKeyConfigured] = useState(true);
    const [activeSpeech, setActiveSpeech] = useState(null);

    const messageListRef = useRef(null);
    const recognitionRef = useRef(null);

    // Check if Groq API key is active on open
    useEffect(() => {
        if (isOpen) {
            const checkApiKey = async () => {
                try {
                    const response = await api.get('accounts/api-configuration/active_config/');
                    const hasGroq = response.data && response.data.provider === 'groq';
                    setIsKeyConfigured(hasGroq);
                } catch (err) {
                    setIsKeyConfigured(false);
                }
            };
            checkApiKey();
        }
    }, [isOpen]);

    // Scroll to bottom when messages update
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Save chat history to localStorage
    useEffect(() => {
        localStorage.setItem('bizionary_chatbot_modal_history', JSON.stringify(messages));
    }, [messages]);

    // Web Speech API configuration
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-US';

            rec.onstart = () => setIsListening(true);
            rec.onend = () => setIsListening(false);
            rec.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setPrompt(transcript);
            };

            recognitionRef.current = rec;
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Voice input is not supported in your browser.');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    const speakText = (text, index) => {
        if (!window.speechSynthesis) return;

        if (activeSpeech === index) {
            window.speechSynthesis.cancel();
            setActiveSpeech(null);
            return;
        }

        window.speechSynthesis.cancel();
        const cleanText = text.replace(/\*\*|__/g, '').replace(/`([^`]+)`/g, '$1');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => setActiveSpeech(null);
        utterance.onerror = () => setActiveSpeech(null);
        setActiveSpeech(index);
        window.speechSynthesis.speak(utterance);
    };

    const handleSend = async (customMessage = null) => {
        const textToSend = customMessage || prompt.trim();
        if (!textToSend) return;

        setError('');
        const nextMessages = [...messages, { sender: 'user', text: textToSend }];
        setMessages(nextMessages);
        setPrompt('');
        setLoading(true);

        if (demoMode || !isKeyConfigured) {
            setTimeout(() => {
                const reply = getOfflineMockResponse(textToSend);
                setMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
                setLoading(false);
            }, 1000);
            return;
        }

        try {
            const history = messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }));
            const response = await chatbotApi.query(textToSend, history);
            const reply = response.data?.data?.response || 'Could not fetch a response.';
            setMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
        } catch (sendError) {
            console.error(sendError);
            const errMsg = sendError.response?.data?.error || sendError.message || 'Service offline.';
            setError(errMsg);
            if (errMsg.includes('not configured')) {
                setIsKeyConfigured(false);
            }
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

    // Offline Response Mock Generator
    const getOfflineMockResponse = (userText) => {
        const text = userText.toLowerCase();
        
        // Revenue questions
        if (text.includes('revenue') || text.includes('sales amount') || text.includes('sales total') || text.includes('trend')) {
            return `### Revenue Analytics 📊\n\nAccording to the local database, your total sales revenue is calculated from recorded invoices.\n\nHere is your monthly net trend:\n\n\`\`\`chart-data\n{\n  "chart_type": "line",\n  "title": "Income vs Expense Trend (Last 6 Months)",\n  "x_key": "month",\n  "series": [\n    {"key": "income", "color": "#3B82F6", "name": "Income"},\n    {"key": "expense", "color": "#EF4444", "name": "Expense"}\n  ],\n  "data": [\n    {"month": "2026-01", "income": 450000, "expense": 320000},\n    {"month": "2026-02", "income": 520000, "expense": 380000},\n    {"month": "2026-03", "income": 490000, "expense": 310000},\n    {"month": "2026-04", "income": 590000, "expense": 420000},\n    {"month": "2026-05", "income": 610000, "expense": 400000},\n    {"month": "2026-06", "income": 700000, "expense": 450000}\n  ]\n}\n\`\`\`\n\nYou can review full details in the [Manage Accounts](route:/accounts) section.`;
        }

        // Low stock / inventory questions
        if (text.includes('stock') || text.includes('low stock') || text.includes('inventory') || text.includes('product')) {
            return `### Inventory Status 📦\n\nThere are currently several products running low on stock (under 15 units).\n\nHere is the stock levels comparison chart:\n\n\`\`\`chart-data\n{\n  "chart_type": "bar",\n  "title": "Low Stock Inventory (Under 15)",\n  "x_key": "name",\n  "series": [\n    {"key": "stock", "color": "#EF4444", "name": "Current Stock"},\n    {"key": "min", "color": "#8B5CF6", "name": "Min Stock"}\n  ],\n  "data": [\n    {"name": "Basmati Rice", "stock": 3, "min": 15},\n    {"name": "Wheat Flour", "stock": 5, "min": 15},\n    {"name": "Cooking Oil", "stock": 2, "min": 15},\n    {"name": "White Sugar", "stock": 7, "min": 15}\n  ]\n}\n\`\`\`\n\nYou can restock or view products inside the [Check Stock/Inventory](route:/inventory-managment) section.`;
        }

        // Module explanation
        if (text.includes('module') || text.includes('section') || text.includes('help') || text.includes('how to')) {
            return `### Bizionary Modules Guide ⚙️\n\nHere's a list of available sections in Bizionary ERP with direct route buttons:\n\n- **Dashboard:** High-level KPIs, payables, and low stock summaries. [Go to Dashboard](route:/)\n- **Accounts:** Financial ledger, revenues vs expenses, and transactions. [Manage Accounts](route:/accounts)\n- **Products:** Product catalog list. [View Products](route:/products)\n- **Stock/Inventory:** View and restock items. [Check Stock/Inventory](route:/inventory-managment)\n- **AI Insights:** Business trends and demand predictions. [AI Insights](route:/insights)`;
        }

        return `### Local Mode response 🤖\n\nI received: "${userText}"\n\n*Running in local Demo mode. Configure a Groq key in Settings for full capabilities.*`;
    };

    const formatText = (text) => {
        if (!text) return '';
        return text.split('\n').map((line, idx) => {
            if (line.startsWith('### ')) {
                return <h5 key={idx} className="font-bold text-slate-800 dark:text-slate-200 mt-1.5 mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider">{line.replace('### ', '')}</h5>;
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
                return <li key={idx} className="ml-4 list-disc text-[10.5px] my-0.5">{parseBoldAndCode(line.slice(2))}</li>;
            }
            return <p key={idx} className="my-0.5 text-[10.5px] leading-relaxed">{parseBoldAndCode(line)}</p>;
        });
    };

    const parseBoldAndCode = (text) => {
        const parts = [];
        let index = 0;
        const formatRegex = /(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\([^)]+\))/g;
        const matches = text.match(formatRegex);
        if (!matches) return text;

        let match;
        const regex = /(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\([^)]+\))/g;
        while ((match = regex.exec(text)) !== null) {
            const matchIndex = match.index;
            const matchText = match[0];
            if (matchIndex > index) {
                parts.push(text.slice(index, matchIndex));
            }
            if (matchText.startsWith('**')) {
                parts.push(<strong key={matchIndex} className="font-bold text-slate-900 dark:text-white">{matchText.slice(2, -2)}</strong>);
            } else if (matchText.startsWith('`')) {
                parts.push(<code key={matchIndex} className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[9.5px] text-primary dark:text-sky-300 border border-slate-200/40 dark:border-slate-700/50">{matchText.slice(1, -1)}</code>);
            } else if (matchText.startsWith('[') && matchText.includes('](')) {
                const linkMatch = matchText.match(/\[([^\]]+)\]\(([^)]+)\)/);
                if (linkMatch) {
                    const label = linkMatch[1];
                    let url = linkMatch[2];
                    
                    if (url.startsWith('route:')) {
                        url = url.replace('route:', '');
                    }
                    
                    // Route fallback mappings
                    if (url === '/stock' || url === '/inventory') {
                        url = '/inventory-managment';
                    } else if (url === '/users' || url === '/roles' || url === '/admin') {
                        url = '/user-management';
                    }
                    
                    const isInternal = url.startsWith('/');
                    if (isInternal) {
                        parts.push(
                            <button
                                key={matchIndex}
                                onClick={() => navigate(url)}
                                className="inline-flex items-center gap-1 mx-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-sky-300 rounded-lg text-[10px] font-bold border border-primary/20 transition active:scale-95 cursor-pointer align-middle"
                            >
                                {label}
                            </button>
                        );
                    } else {
                        parts.push(
                            <a
                                key={matchIndex}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary dark:text-sky-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                            >
                                {label}
                            </a>
                        );
                    }
                }
            }
            index = regex.lastIndex;
        }
        if (index < text.length) parts.push(text.slice(index));
        return parts;
    };

    // Render interactive charts inside message bubbles
    const renderChart = (config, index) => {
        if (!config || !config.data || !config.data.length) {
            return (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-250/30 rounded-2xl text-[10px] text-textMuted text-center mt-3">
                    No data available for chart.
                </div>
            );
        }

        const { chart_type, title, x_key, series, data } = config;
        const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        const tooltipStyle = {
            backgroundColor: '#1E293B',
            border: 'none',
            borderRadius: '8px',
            color: '#F8FAFC',
            fontSize: '10px',
            padding: '6px 10px',
        };

        const renderChartComponent = () => {
            if (chart_type === 'line') {
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                        <XAxis dataKey={x_key} tick={{ fontSize: 9, fill: '#64748B' }} stroke="#cbd5e1" />
                        <YAxis tick={{ fontSize: 9, fill: '#64748B' }} stroke="#cbd5e1" width={25} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 9, marginTop: 5 }} />
                        {series.map((s, idx) => (
                            <Line
                                key={s.key}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name || s.key}
                                stroke={s.color || COLORS[idx % COLORS.length]}
                                strokeWidth={2.5}
                                activeDot={{ r: 5 }}
                                dot={{ r: 3 }}
                            />
                        ))}
                    </LineChart>
                );
            }

            if (chart_type === 'pie') {
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={3}
                            dataKey={series[0]?.key || 'total'}
                            nameKey={x_key}
                            label={({ name, percent }) => `${name.substring(0, 8)} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                            style={{ fontSize: 7, fill: '#64748B' }}
                        >
                            {data.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                );
            }

            // Fallback / Bar Chart
            return (
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                    <XAxis dataKey={x_key} tick={{ fontSize: 9, fill: '#64748B' }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 9, fill: '#64748B' }} stroke="#cbd5e1" width={25} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 9, marginTop: 5 }} />
                    {series.map((s, idx) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.name || s.key}
                            fill={s.color || COLORS[idx % COLORS.length]}
                            radius={[4, 4, 0, 0]}
                        />
                    ))}
                </BarChart>
            );
        };

        return (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner w-full min-w-[240px] animate-in fade-in zoom-in-95 duration-300">
                {title && <h5 className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mb-2.5 text-center uppercase tracking-wide">{title}</h5>}
                <div className="w-full h-[130px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChartComponent()}
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    // Parse chart-data blocks from message text and delegate rendering
    const renderMessageContent = (msg, index) => {
        const text = msg.text || '';
        const chartBlockRegex = /```chart-data\s*([\s\S]*?)\s*```/;
        const match = text.match(chartBlockRegex);
        
        let plainText = text;
        let chartData = null;
        
        if (match) {
            plainText = text.replace(chartBlockRegex, '').trim();
            try {
                chartData = JSON.parse(match[1]);
            } catch (err) {
                console.error('Failed to parse chart-data JSON from message', err);
            }
        }
        
        return (
            <div>
                <div className="space-y-1">
                    {formatText(plainText)}
                </div>
                {chartData && renderChart(chartData, index)}
            </div>
        );
    };

    const handleClearHistory = () => {
        if (window.confirm('Clear chat history?')) {
            window.speechSynthesis.cancel();
            setMessages([
                {
                    sender: 'assistant',
                    text: 'Hello! 👋 I\'m your AI Support Assistant. I can help with orders, stock levels, sales analytics, or erp guides. Ask me anything or select a shortcut below!',
                },
            ]);
            setError('');
            setActiveSpeech(null);
        }
    };

    const shortcuts = [
        { label: '📊 Revenue', query: 'What is our current revenue?' },
        { label: '📦 Low Stock', query: 'Which products are low on stock?' },
        { label: '⚙️ ERP Guide', query: 'Explain the available modules' }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/10 pointer-events-auto" onClick={onClose} />

            {/* Modal Drawer Layout */}
            <div className="relative z-50 w-full max-w-[22rem] rounded-3xl bg-white shadow-2xl border border-slate-200/85 flex flex-col max-h-[520px] overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-[#1C3A5A] text-white border-b border-[#0f1f33] shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                            <Bot className="w-4.5 h-4.5 text-emerald-300" />
                        </div>
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-wide">Bizionary AI Support</h2>
                            <p className="text-[9px] text-emerald-400 font-semibold">{(demoMode || !isKeyConfigured) ? 'Local Demo Mode' : 'Online • Powered by Groq'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleClearHistory}
                            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
                            title="Clear History"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
                            title="Close"
                        >
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>

                {/* API Warning */}
                {!isKeyConfigured && (
                    <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center justify-between gap-2 text-orange-800 text-[10px]">
                        <span className="font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            Demo mode active
                        </span>
                        <button
                            onClick={() => setDemoMode(true)}
                            className="bg-orange-100 hover:bg-orange-200 text-orange-900 px-2 py-0.5 rounded text-[9px] font-bold transition-all duration-300 ease-in-out"
                        >
                            Confirm Demo
                        </button>
                    </div>
                )}

                {/* Messages Body */}
                <div
                    ref={messageListRef}
                    className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-50 to-white"
                >
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex flex-col max-w-[85%] ${message.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                        >
                            <div className={`p-3 rounded-2xl border text-xs shadow-sm ${
                                message.sender === 'user'
                                    ? 'bg-[#1C3A5A] text-white border-[#1C3A5A]/20 rounded-tr-none'
                                    : 'bg-slate-100 text-slate-800 border-slate-200/60 rounded-tl-none'
                            }`}>
                                {renderMessageContent(message, index)}
                                
                                {message.sender === 'assistant' && (
                                    <div className="flex justify-end mt-2 pt-1 border-t border-slate-200/50">
                                        <button
                                            onClick={() => speakText(message.text, index)}
                                            className={`p-1 rounded hover:bg-slate-200/40 transition-all duration-300 ease-in-out ${activeSpeech === index ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
                                            title="Read text out loud"
                                        >
                                            <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Question Chips - Render inside list if only welcome message is there */}
                    {messages.length === 1 && (
                        <div className="pt-2 space-y-1.5 animate-in fade-in duration-300">
                            <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider block mb-1">Shortcut Queries:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {shortcuts.map((chip, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(chip.query)}
                                        className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-250 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-full font-bold text-left transition-all duration-300 ease-in-out active:scale-95 shadow-sm"
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="mr-auto items-start flex flex-col">
                            <div className="bg-slate-100 p-2.5 rounded-2xl border border-slate-200/60 rounded-tl-none flex items-center gap-1.5 shadow-sm">
                                <span className="w-2 h-2 bg-[#1C3A5A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-[#1C3A5A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-[#1C3A5A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] border border-rose-100 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-150 bg-white p-3">
                    <div className="relative flex items-center">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your question..."
                            className="w-full pl-3 pr-16 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs outline-none shadow-sm focus:shadow-md focus:border-[#1C3A5A] focus:bg-white transition-all duration-300 ease-in-out resize-none min-h-[36px] max-h-[80px]"
                            rows="1"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={`p-1.5 rounded-lg transition-all duration-300 ease-in-out ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-100 hover:scale-105'}`}
                                title="Speak"
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSend()}
                                disabled={loading || !prompt.trim()}
                                className="p-1.5 bg-gradient-to-br from-[#1C3A5A] to-[#2B527E] hover:from-[#13283E] hover:to-[#1C3A5A] text-white rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatbotModal;
