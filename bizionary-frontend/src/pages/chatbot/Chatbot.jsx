import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { 
    Bot, Send, Mic, MicOff, Volume2, VolumeX, Trash2, 
    Download, RefreshCw, AlertCircle, HelpCircle, 
    ThumbsUp, ThumbsDown, Database, Copy, Check
} from 'lucide-react';
import { chatbotApi } from '../../services/chatbotApi';
import api from '../../services/api';

const Chatbot = () => {
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('bizionary_chatbot_history');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved chatbot history', e);
            }
        }
        return [
            {
                sender: 'assistant',
                text: 'Hello! I am your Bizionary AI Assistant. 🤖\n\nI can help you analyze sales data, check current inventory, review invoices, or explain any business workflows. \n\nClick any shortcut on the right to get started, or type your question below!',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
        ];
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [readAloud, setReadAloud] = useState(false);
    const [demoMode, setDemoMode] = useState(false);
    const [isKeyConfigured, setIsKeyConfigured] = useState(true);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [ratings, setRatings] = useState({}); // { [index]: 'up' | 'down' }
    const [kpis, setKpis] = useState(null);
    const [activeSpeech, setActiveSpeech] = useState(null); // Track index of message being read aloud

    const messageListRef = useRef(null);
    const recognitionRef = useRef(null);

    // Fetch dashboard KPIs to display in the side panel
    useEffect(() => {
        const fetchKPIs = async () => {
            try {
                const response = await api.get('dashboard/kpis/');
                setKpis(response.data);
            } catch (err) {
                console.warn('Failed to fetch dashboard KPIs for chatbot panel', err);
            }
        };
        fetchKPIs();
    }, []);

    // Check if Groq API key is active on component mount
    useEffect(() => {
        const checkApiKey = async () => {
            try {
                const response = await api.get('accounts/api-configuration/active_config/');
                // Check if active config has provider 'groq'
                const hasGroq = response.data && response.data.provider === 'groq';
                setIsKeyConfigured(hasGroq);
            } catch (err) {
                // If 404 or other error, assume not configured
                setIsKeyConfigured(false);
            }
        };
        checkApiKey();
    }, []);

    // Scroll to bottom when messages list updates
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Save chat history to localStorage
    useEffect(() => {
        localStorage.setItem('bizionary_chatbot_history', JSON.stringify(messages));
    }, [messages]);

    // Initialize Web Speech API for voice input
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-US';

            rec.onstart = () => setIsListening(true);
            rec.onend = () => setIsListening(false);
            rec.onerror = (e) => {
                console.error('Speech recognition error', e);
                setIsListening(false);
            };
            rec.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setPrompt(transcript);
            };

            recognitionRef.current = rec;
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Voice input is not supported in this browser. Try Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    // Text to Speech
    const speakText = (text, index) => {
        if (!window.speechSynthesis) return;

        if (activeSpeech === index) {
            window.speechSynthesis.cancel();
            setActiveSpeech(null);
            return;
        }

        window.speechSynthesis.cancel(); // Stop any ongoing speech
        
        // Clean markdown structures from text for cleaner speech
        const cleanText = text
            .replace(/\*\*|__/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[-*#]/g, '');

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
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Append user message
        const nextMessages = [...messages, { sender: 'user', text: textToSend, timestamp }];
        setMessages(nextMessages);
        setPrompt('');
        setLoading(true);

        // Offline Demo Mode Logic
        if (demoMode || !isKeyConfigured) {
            setTimeout(() => {
                const responseText = getOfflineMockResponse(textToSend);
                setMessages(prev => [...prev, { 
                    sender: 'assistant', 
                    text: responseText, 
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
                setLoading(false);
                
                if (readAloud) {
                    speakText(responseText, nextMessages.length);
                }
            }, 1000);
            return;
        }

        try {
            const history = messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }));
            const response = await chatbotApi.query(textToSend, history);
            const reply = response.data?.data?.response || 'I encountered an issue processing that query. Please try again.';
            
            setMessages(prev => [...prev, { 
                sender: 'assistant', 
                text: reply, 
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            
            if (readAloud) {
                speakText(reply, nextMessages.length);
            }
        } catch (sendError) {
            console.error(sendError);
            const errMsg = sendError.response?.data?.error || sendError.message || 'Service unavailable.';
            setError(errMsg);
            // Auto fallback to demo mode alert
            if (errMsg.includes('not configured') || errMsg.includes('API key')) {
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

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleRate = (index, type) => {
        setRatings(prev => ({
            ...prev,
            [index]: prev[index] === type ? null : type
        }));
    };

    const resetChat = () => {
        if (window.confirm('Clear all chat conversations?')) {
            window.speechSynthesis.cancel();
            setMessages([
                {
                    sender: 'assistant',
                    text: 'Hello! I am your Bizionary AI Assistant. 🤖\n\nI can help you analyze sales data, check current inventory, review invoices, or explain any business workflows. \n\nClick any shortcut on the right to get started, or type your question below!',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
            setError('');
            setRatings({});
            setActiveSpeech(null);
        }
    };

    const exportChat = () => {
        const transcript = messages.map(m => `[${m.timestamp}] ${m.sender.toUpperCase()}: ${m.text}`).join('\n\n');
        const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bizionary-chat-log-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Offline Response Mock Generator
    const getOfflineMockResponse = (userText) => {
        const text = userText.toLowerCase();
        
        // Revenue questions
        if (text.includes('revenue') || text.includes('sales amount') || text.includes('sales total') || text.includes('trend')) {
            const rev = kpis?.total_revenue ? `Rs ${Number(kpis.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Rs 1,245,630.00';
            return `### Revenue Analytics 📊\n\nAccording to the local database, your **current total sales revenue** is **${rev}**.\n\nHere is your monthly net trend:\n\n\`\`\`chart-data\n{\n  "chart_type": "line",\n  "title": "Income vs Expense Trend (Last 6 Months)",\n  "x_key": "month",\n  "series": [\n    {"key": "income", "color": "#3B82F6", "name": "Income"},\n    {"key": "expense", "color": "#EF4444", "name": "Expense"}\n  ],\n  "data": [\n    {"month": "2026-01", "income": 450000, "expense": 320000},\n    {"month": "2026-02", "income": 520000, "expense": 380000},\n    {"month": "2026-03", "income": 490000, "expense": 310000},\n    {"month": "2026-04", "income": 590000, "expense": 420000},\n    {"month": "2026-05", "income": 610000, "expense": 400000},\n    {"month": "2026-06", "income": 700000, "expense": 450000}\n  ]\n}\n\`\`\`\n\nYou can review full details in the [Manage Accounts](route:/accounts) section.`;
        }

        // Low stock / inventory questions
        if (text.includes('stock') || text.includes('low stock') || text.includes('inventory') || text.includes('product')) {
            const count = kpis?.low_stock_count || 12;
            return `### Inventory Status 📦\n\nThere are currently **${count} products running low on stock** (under 15 units).\n\nHere is the low stock levels comparison chart:\n\n\`\`\`chart-data\n{\n  "chart_type": "bar",\n  "title": "Low Stock Inventory (Under 15)",\n  "x_key": "name",\n  "series": [\n    {"key": "stock", "color": "#EF4444", "name": "Current Stock"},\n    {"key": "min", "color": "#8B5CF6", "name": "Min Stock"}\n  ],\n  "data": [\n    {"name": "Basmati Rice", "stock": 3, "min": 15},\n    {"name": "Wheat Flour", "stock": 5, "min": 15},\n    {"name": "Cooking Oil", "stock": 2, "min": 15},\n    {"name": "White Sugar", "stock": 7, "min": 15}\n  ]\n}\n\`\`\`\n\nYou can restock or view products inside the [Check Stock/Inventory](route:/inventory-managment) section.`;
        }

        // Invoice questions
        if (text.includes('invoice') || text.includes('unpaid') || text.includes('outstanding') || text.includes('payables')) {
            return `### Invoices Summary 🧾\n\nHere is your financial invoices outlook:\n- **Pending Invoices:** 8 client invoices are waiting for payment.\n- **Outstanding Payables:** Rs 342,900.00 due to suppliers.\n\nYou can view and generate invoices inside the [View Invoices](route:/invoices) and check expenses in [Manage Accounts](route:/accounts).`;
        }

        // Module explanation
        if (text.includes('module') || text.includes('section') || text.includes('help') || text.includes('how to')) {
            return `### Bizionary Modules Guide ⚙️\n\nHere's a list of available sections in Bizionary ERP with direct route buttons:\n\n- **Dashboard:** High-level KPIs, payables, and low stock summaries. [Go to Dashboard](route:/)\n- **Accounts:** Financial ledger, revenues vs expenses, and transactions. [Manage Accounts](route:/accounts)\n- **Products:** Product catalog list. [View Products](route:/products)\n- **Stock/Inventory:** View and restock items. [Check Stock/Inventory](route:/inventory-managment)\n- **AI Insights:** Business trends and demand predictions. [AI Insights](route:/insights)`;
        }

        return `### Offline Intelligence (Demo Mode) 🤖\n\nI received: "${userText}"\n\n*Note: The Groq API Key is currently unconfigured or offline, so I am running in local Demo Mode. I can answer inquiries about **revenue**, **low stock**, **invoices**, and **available modules** using cached database KPIs!*`;
    };

    // Custom formatting function to render markdown-like structures
    const formatMessageText = (text) => {
        if (!text) return '';
        
        return text.split('\n').map((line, idx) => {
            let renderedLine = line;
            
            // Render Headers (e.g. ### Header)
            if (renderedLine.startsWith('### ')) {
                return <h4 key={idx} className="text-sm font-bold text-primary dark:text-slate-200 mt-2 mb-1 flex items-center gap-1.5">{renderedLine.replace('### ', '')}</h4>;
            }
            
            // Render Bullet points (e.g. - item)
            if (renderedLine.startsWith('- ') || renderedLine.startsWith('* ')) {
                const listContent = renderedLine.slice(2);
                return (
                    <ul key={idx} className="list-disc pl-5 my-0.5 space-y-0.5 text-xs">
                        <li>{parseInlineFormatting(listContent)}</li>
                    </ul>
                );
            }
            
            // Render numbered list (e.g. 1. item)
            const numListMatch = renderedLine.match(/^(\d+)\.\s(.*)/);
            if (numListMatch) {
                return (
                    <ol key={idx} className="list-decimal pl-5 my-0.5 space-y-0.5 text-xs">
                        <li value={numListMatch[1]}>{parseInlineFormatting(numListMatch[2])}</li>
                    </ol>
                );
            }
            
            return <p key={idx} className="my-1 leading-5 text-xs">{parseInlineFormatting(renderedLine)}</p>;
        });
    };

    // Parse bold text, inline code blocks, and internal route/hyperlinks
    const parseInlineFormatting = (text) => {
        const parts = [];
        let index = 0;
        
        // Regex to match **bold**, `code`, and [text](link)
        const formatRegex = /(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\([^)]+\))/g;
        const matches = text.match(formatRegex);
        
        if (!matches) {
            return text;
        }
        
        let match;
        const regex = /(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\([^)]+\))/g;
        while ((match = regex.exec(text)) !== null) {
            const matchIndex = match.index;
            const matchText = match[0];
            
            // Add text before match
            if (matchIndex > index) {
                parts.push(text.slice(index, matchIndex));
            }
            
            if (matchText.startsWith('**') && matchText.endsWith('**')) {
                parts.push(<strong key={matchIndex} className="font-bold text-primary dark:text-card">{matchText.slice(2, -2)}</strong>);
            } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
                parts.push(<code key={matchIndex} className="bg-page dark:bg-primary px-1 py-0.5 rounded font-mono text-[10px] text-primary dark:text-sky-300 border border-card/40 dark:border-slate-700/50">{matchText.slice(1, -1)}</code>);
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
                    
                    const isApiUrl = url.startsWith('/api/');
                    const isInternal = url.startsWith('/') && !isApiUrl;
                    if (isApiUrl) {
                        const backendUrl = (api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api\/?$/, '') : '') + url;
                        parts.push(
                            <a
                                key={matchIndex}
                                href={backendUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mx-1 px-3 py-1.5 bg-status-success hover:bg-emerald-700 text-card rounded-xl text-[10px] font-bold shadow-sm transition active:scale-95 cursor-pointer align-middle no-underline"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {label}
                            </a>
                        );
                    } else if (isInternal) {
                        parts.push(
                            <button
                                key={matchIndex}
                                onClick={() => navigate(url)}
                                className="inline-flex items-center gap-1 mx-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-sky-300 rounded-full text-[10px] font-bold border border-primary/20 transition active:scale-95 cursor-pointer align-middle"
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
        
        if (index < text.length) {
            parts.push(text.slice(index));
        }
        
        return parts;
    };

    // Render interactive charts inside message bubbles
    const renderChart = (config, index) => {
        if (!config || !config.data || !config.data.length) {
            return (
                <div className="p-4 bg-page dark:bg-primary border border-slate-250/30 rounded-2xl text-[10px] text-textMuted text-center mt-3">
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
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={3}
                            dataKey={series[0]?.key || 'total'}
                            nameKey={x_key}
                            label={({ name, percent }) => `${name.substring(0, 8)} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                            style={{ fontSize: 8, fill: '#64748B' }}
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
            <div className="mt-3 p-4 bg-page dark:bg-primary border border-card dark:border-slate-800 rounded-2xl shadow-inner w-full min-w-[260px] animate-in fade-in zoom-in-95 duration-300">
                {title && <h5 className="text-[10px] font-bold text-primary dark:text-slate-300 mb-2.5 text-center uppercase tracking-wide">{title}</h5>}
                <div className="w-full h-[150px]">
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
                    {formatMessageText(plainText)}
                </div>
                {chartData && renderChart(chartData, index)}
            </div>
        );
    };

    const shortcuts = [
        { label: '📊 Check Revenue', query: 'What is our current revenue?' },
        { label: '📦 Check Low Stock', query: 'Which products are running low on stock?' },
        { label: '🧾 Unpaid Invoices', query: 'Do we have any unpaid invoices?' },
        { label: '⚙️ Modules Guide', query: 'Explain the available modules in Bizionary ERP' }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto h-[calc(100vh-6rem)] min-h-[500px]">
            {/* Left Chat Screen (Takes 3 columns on desktop) */}
            <div className="lg:col-span-3 flex flex-col h-full bg-card dark:bg-primary border border-card dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden relative">
                {/* Header Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-card dark:border-slate-800 bg-page/50 dark:bg-primary/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-primary dark:text-card">AI Assistant</h2>
                            <p className="text-[10px] text-textMuted flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${(demoMode || !isKeyConfigured) ? 'bg-orange-400' : 'bg-status-success animate-pulse'}`}></span>
                                {(demoMode || !isKeyConfigured) ? 'Demo Mode (Offline)' : 'Online • Powered by Groq'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Read Aloud Toggle */}
                        <button
                            onClick={() => setReadAloud(!readAloud)}
                            className={`p-2 rounded-xl transition ${readAloud ? 'bg-primary/10 text-primary' : 'text-textMuted hover:bg-page dark:hover:bg-primary'}`}
                            title="Toggle Read Aloud"
                        >
                            {readAloud ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                        
                        {/* Reset Chat */}
                        <button
                            onClick={resetChat}
                            className="p-2 rounded-xl text-textMuted hover:text-red-500 hover:bg-status-info/10 dark:hover:bg-red-950/20 transition"
                            title="Clear conversation history"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        
                        {/* Export Chat */}
                        <button
                            onClick={exportChat}
                            className="p-2 rounded-xl text-textMuted hover:bg-page dark:hover:bg-primary transition"
                            title="Export chat transcript"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* API Key Missing Banner Alert */}
                {!isKeyConfigured && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-900/30 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-orange-800 dark:text-orange-300">
                        <div className="flex items-start gap-2.5 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />
                            <div>
                                <span className="font-bold">Groq API Key Not Configured</span>
                                <p className="opacity-90 mt-0.5 text-[11px]">Chatbot is running in local Demo Mode. Set a Groq Key in Settings to enable live AI reasoning.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setDemoMode(true)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition ${demoMode ? 'bg-orange-600 text-card shadow-sm' : 'border border-orange-300 text-orange-800 dark:text-orange-400 hover:bg-orange-100'}`}
                            >
                                Use Demo Mode
                            </button>
                            <a
                                href="/settings"
                                className="px-2.5 py-1 text-[10px] font-bold bg-orange-100 hover:bg-orange-200 text-orange-900 rounded-full transition"
                            >
                                Set Key
                            </a>
                        </div>
                    </div>
                )}

                {/* Messages Body */}
                <div
                    ref={messageListRef}
                    className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/40 dark:to-slate-900"
                >
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                        >
                            <div className="text-[10px] text-textMuted mb-1 flex items-center gap-1.5">
                                <span className="font-bold">{msg.sender === 'user' ? '👤 You' : '🤖 AI Assistant'}</span>
                                <span>•</span>
                                <span>{msg.timestamp}</span>
                            </div>
                            
                            <div className={`p-4 rounded-2xl shadow-sm border text-xs leading-relaxed transition ${
                                msg.sender === 'user'
                                    ? 'bg-primary text-card border-primary/20 rounded-tr-none'
                                    : 'bg-card dark:bg-slate-850 text-primary dark:text-slate-100 border-card dark:border-slate-800/80 rounded-tl-none'
                            }`}>
                                {renderMessageContent(msg, index)}
                                
                                {/* AI Message Utilities */}
                                {msg.sender === 'assistant' && (
                                    <div className="flex items-center justify-between border-t border-card dark:border-slate-800 mt-3 pt-2">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => speakText(msg.text, index)}
                                                className={`p-1.5 rounded-xl transition ${activeSpeech === index ? 'text-primary bg-primary/10' : 'text-textMuted hover:bg-page dark:hover:bg-primary'}`}
                                                title="Read text out loud"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleCopy(msg.text, index)}
                                                className="p-1.5 rounded-xl text-textMuted hover:bg-page dark:hover:bg-primary transition"
                                                title="Copy to clipboard"
                                            >
                                                {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleRate(index, 'up')}
                                                className={`p-1.5 rounded-xl transition ${ratings[index] === 'up' ? 'text-status-success bg-status-success/10 dark:bg-emerald-950/20' : 'text-textMuted hover:bg-page'}`}
                                            >
                                                <ThumbsUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleRate(index, 'down')}
                                                className={`p-1.5 rounded-xl transition ${ratings[index] === 'down' ? 'text-status-info bg-status-info/10 dark:bg-rose-950/20' : 'text-textMuted hover:bg-page'}`}
                                            >
                                                <ThumbsDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="mr-auto items-start max-w-[80%] flex flex-col animate-pulse">
                            <div className="text-[10px] text-textMuted mb-1">🤖 AI Assistant • Thinking...</div>
                            <div className="bg-card dark:bg-slate-850 p-4 rounded-2xl border border-card dark:border-slate-800 rounded-tl-none flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-6 py-2 bg-status-info/10 dark:bg-rose-950/20 text-status-info dark:text-rose-400 text-xs border-t border-rose-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Footer Input Area */}
                <div className="border-t border-card dark:border-slate-800 p-4 bg-card dark:bg-primary rounded-b-3xl">
                    <div className="relative flex items-center">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything about Bizionary..."
                            className="w-full pl-4 pr-24 py-3 bg-page dark:bg-primary border border-card dark:border-slate-850 rounded-2xl text-xs text-primary dark:text-slate-100 shadow-inner outline-none focus:border-primary focus:bg-card dark:focus:bg-primary transition resize-none min-h-[48px] max-h-[120px]"
                            rows="1"
                        />
                        
                        <div className="absolute right-3 flex items-center gap-1.5">
                            {/* Voice Button */}
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={`p-2 rounded-xl transition active:scale-95 ${isListening ? 'bg-rose-500 text-card shadow-md animate-pulse' : 'text-textMuted hover:bg-page dark:hover:bg-primary'}`}
                                title={isListening ? 'Stop listening' : 'Speak your query'}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>

                            {/* Send Button */}
                            <button
                                type="button"
                                onClick={() => handleSend()}
                                disabled={loading || !prompt.trim()}
                                className="p-2 bg-gradient-to-br from-[#2B2620] to-[#2B2620] hover:from-[#13283E] hover:to-[#2B2620] text-card rounded-xl transition-all duration-300 ease-in-out disabled:opacity-50 hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Guide Screen (Takes 1 column on desktop, hidden on mobile/tablet) */}
            <div className="hidden lg:flex flex-col gap-6 h-full">
                {/* Shortcuts & Guide */}
                <div className="bg-card dark:bg-primary border border-card dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-primary dark:text-card uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-primary" />
                        Quick Shortcuts
                    </h3>
                    <p className="text-[11px] text-textMuted dark:text-secondary">
                        Click any prompt card below to test the query instantly:
                    </p>
                    <div className="space-y-2">
                        {shortcuts.map((shortcut, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(shortcut.query)}
                                disabled={loading}
                                className="w-full p-3 bg-page hover:bg-primary/5 dark:bg-primary/40 hover:text-primary dark:hover:text-sky-400 text-left text-xs font-semibold rounded-xl border border-card dark:border-slate-800/80 transition active:scale-[0.98] disabled:opacity-50"
                            >
                                {shortcut.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dashboard Metrics (Cached in state) */}
                <div className="bg-card dark:bg-primary border border-card dark:border-slate-800 p-5 rounded-2xl shadow-sm flex-1 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-primary dark:text-card uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <Database className="w-4 h-4 text-emerald-500" />
                            Live Statistics
                        </h3>
                        <p className="text-[10px] text-textMuted dark:text-secondary">
                            Current database figures cached locally for AI context:
                        </p>
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                        <div className="p-3 bg-page dark:bg-primary/20 rounded-xl border border-gray-50 dark:border-slate-850 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-textMuted uppercase">Revenue</span>
                            <span className="text-xs font-black text-primary dark:text-card">
                                {kpis?.total_revenue ? `Rs ${Number(kpis.total_revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Rs 1,245,630'}
                            </span>
                        </div>
                        
                        <div className="p-3 bg-page dark:bg-primary/20 rounded-xl border border-gray-50 dark:border-slate-850 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-textMuted uppercase">Low Stock</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${kpis?.low_stock_count > 0 ? 'bg-status-info/20 text-status-info' : 'bg-page text-primary'}`}>
                                {kpis?.low_stock_count || 12} items
                            </span>
                        </div>
                        
                        <div className="p-3 bg-page dark:bg-primary/20 rounded-xl border border-gray-50 dark:border-slate-850 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-textMuted uppercase">Sales Goal</span>
                            <span className="text-xs font-black text-primary dark:text-card">
                                {kpis?.sales_growth_percentage || '64%'}
                            </span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-50 dark:border-slate-850 text-center">
                        <span className="text-[9px] text-textMuted">
                            Bizionary ERP AI Support Engine
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
