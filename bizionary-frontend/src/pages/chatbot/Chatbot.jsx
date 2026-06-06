import React, { useState, useRef, useEffect } from 'react';
import { 
    Bot, Send, Mic, MicOff, Volume2, VolumeX, Trash2, 
    Download, RefreshCw, AlertCircle, HelpCircle, 
    ThumbsUp, ThumbsDown, Database, Copy, Check
} from 'lucide-react';
import { chatbotApi } from '../../services/chatbotApi';
import api from '../../services/api';

const Chatbot = () => {
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
        if (text.includes('revenue') || text.includes('sales amount') || text.includes('sales total')) {
            const rev = kpis?.total_sales_amount || 'Rs 1,245,630.00';
            return `### Revenue Analytics 📊\n\nAccording to the local database, your **current total sales revenue** is **${rev}**.\n\nYou can review full details and monthly breakdowns in the **Sales & Items Management** section under the *Sales Analytics* tab.`;
        }

        // Low stock / inventory questions
        if (text.includes('stock') || text.includes('low stock') || text.includes('inventory') || text.includes('product')) {
            const count = kpis?.low_stock_count || 12;
            return `### Inventory Status 📦\n\nThere are currently **${count} products running low on stock** (under 15 units).\n\nHere are some of the low-stock items:\n- **Al-Noor Premium Basmati Rice (5kg)** (3 units left)\n- **Gold Medal Wheat Flour (10kg)** (5 units left)\n- **Premium Cooking Oil (5L)** (2 units left)\n\nYou can check the **Stock** page to trigger smart restock orders or see the full catalog.`;
        }

        // Invoice questions
        if (text.includes('invoice') || text.includes('unpaid') || text.includes('outstanding') || text.includes('payables')) {
            return `### Invoices Summary 🧾\n\nHere is your financial invoices outlook:\n- **Pending Invoices:** 8 client invoices are waiting for payment.\n- **Outstanding Payables:** Rs 342,900.00 due to suppliers.\n\nYou can view and generate slips inside the **Accounts** & **Invoices** modules.`;
        }

        // Module explanation
        if (text.includes('module') || text.includes('section') || text.includes('help') || text.includes('how to')) {
            return `### Bizionary Modules Guide ⚙️\n\nHere's a list of available sections in Bizionary:\n1. **Dashboard:** High-level KPIs, payables, and low stock summaries.\n2. **Accounts:** Financial ledger, revenues vs expenses, and transaction logs.\n3. **Products:** Catalog list, stock levels, and category assignments.\n4. **Sales:** Invoices and customer receipts.\n5. **Create Order:** Live order-slips generator for quick checkouts.`;
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
                return <h4 key={idx} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 mb-1 flex items-center gap-1.5">{renderedLine.replace('### ', '')}</h4>;
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

    // Parse bold text and inline code blocks
    const parseInlineFormatting = (text) => {
        const parts = [];
        let index = 0;
        
        // Regex to match **bold** and `code`
        const formatRegex = /(\*\*.*?\*\*|`.*?`)/g;
        const matches = text.match(formatRegex);
        
        if (!matches) {
            return text;
        }
        
        let match;
        const regex = /(\*\*.*?\*\*|`.*?`)/g;
        while ((match = regex.exec(text)) !== null) {
            const matchIndex = match.index;
            const matchText = match[0];
            
            // Add text before match
            if (matchIndex > index) {
                parts.push(text.slice(index, matchIndex));
            }
            
            if (matchText.startsWith('**') && matchText.endsWith('**')) {
                parts.push(<strong key={matchIndex} className="font-bold text-slate-900 dark:text-white">{matchText.slice(2, -2)}</strong>);
            } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
                parts.push(<code key={matchIndex} className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px] text-primary dark:text-sky-300 border border-slate-200/40 dark:border-slate-700/50">{matchText.slice(1, -1)}</code>);
            }
            
            index = regex.lastIndex;
        }
        
        if (index < text.length) {
            parts.push(text.slice(index));
        }
        
        return parts;
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
            <div className="lg:col-span-3 flex flex-col h-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden relative">
                {/* Header Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Assistant</h2>
                            <p className="text-[10px] text-textMuted flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${(demoMode || !isKeyConfigured) ? 'bg-orange-400' : 'bg-emerald-500 animate-pulse'}`}></span>
                                {(demoMode || !isKeyConfigured) ? 'Demo Mode (Offline)' : 'Online • Powered by Groq'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Read Aloud Toggle */}
                        <button
                            onClick={() => setReadAloud(!readAloud)}
                            className={`p-2 rounded-xl transition ${readAloud ? 'bg-primary/10 text-primary' : 'text-textMuted hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title="Toggle Read Aloud"
                        >
                            {readAloud ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                        
                        {/* Reset Chat */}
                        <button
                            onClick={resetChat}
                            className="p-2 rounded-xl text-textMuted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                            title="Clear conversation history"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        
                        {/* Export Chat */}
                        <button
                            onClick={exportChat}
                            className="p-2 rounded-xl text-textMuted hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${demoMode ? 'bg-orange-600 text-white shadow-sm' : 'border border-orange-300 text-orange-800 dark:text-orange-400 hover:bg-orange-100'}`}
                            >
                                Use Demo Mode
                            </button>
                            <a
                                href="/settings"
                                className="px-2.5 py-1 text-[10px] font-bold bg-orange-100 hover:bg-orange-200 text-orange-900 rounded-lg transition"
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
                            
                            <div className={`p-4 rounded-3xl shadow-sm border text-xs leading-relaxed transition ${
                                msg.sender === 'user'
                                    ? 'bg-primary text-white border-primary/20 rounded-tr-none'
                                    : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 border-gray-100 dark:border-slate-800/80 rounded-tl-none'
                            }`}>
                                {formatMessageText(msg.text)}
                                
                                {/* AI Message Utilities */}
                                {msg.sender === 'assistant' && (
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-3 pt-2">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => speakText(msg.text, index)}
                                                className={`p-1.5 rounded-lg transition ${activeSpeech === index ? 'text-primary bg-primary/10' : 'text-textMuted hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                title="Read text out loud"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleCopy(msg.text, index)}
                                                className="p-1.5 rounded-lg text-textMuted hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                                title="Copy to clipboard"
                                            >
                                                {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleRate(index, 'up')}
                                                className={`p-1.5 rounded-lg transition ${ratings[index] === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 'text-textMuted hover:bg-slate-50'}`}
                                            >
                                                <ThumbsUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleRate(index, 'down')}
                                                className={`p-1.5 rounded-lg transition ${ratings[index] === 'down' ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' : 'text-textMuted hover:bg-slate-50'}`}
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
                            <div className="bg-white dark:bg-slate-850 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 rounded-tl-none flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="px-6 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs border-t border-rose-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Footer Input Area */}
                <div className="border-t border-gray-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 rounded-b-3xl">
                    <div className="relative flex items-center">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything about Bizionary..."
                            className="w-full pl-4 pr-24 py-3 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-2xl text-xs text-slate-800 dark:text-slate-100 shadow-inner outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition resize-none min-h-[48px] max-h-[120px]"
                            rows="1"
                        />
                        
                        <div className="absolute right-3 flex items-center gap-1.5">
                            {/* Voice Button */}
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={`p-2 rounded-xl transition active:scale-95 ${isListening ? 'bg-rose-500 text-white shadow-md animate-pulse' : 'text-textMuted hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                title={isListening ? 'Stop listening' : 'Speak your query'}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>

                            {/* Send Button */}
                            <button
                                type="button"
                                onClick={() => handleSend()}
                                disabled={loading || !prompt.trim()}
                                className="p-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primaryDark hover:to-blue-700 text-white rounded-xl transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-primary" />
                        Quick Shortcuts
                    </h3>
                    <p className="text-[11px] text-textMuted dark:text-gray-400">
                        Click any prompt card below to test the query instantly:
                    </p>
                    <div className="space-y-2">
                        {shortcuts.map((shortcut, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(shortcut.query)}
                                disabled={loading}
                                className="w-full p-3 bg-slate-50 hover:bg-primary/5 dark:bg-slate-950/40 hover:text-primary dark:hover:text-sky-400 text-left text-xs font-semibold rounded-xl border border-gray-100 dark:border-slate-800/80 transition active:scale-[0.98] disabled:opacity-50"
                            >
                                {shortcut.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dashboard Metrics (Cached in state) */}
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex-1 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <Database className="w-4 h-4 text-emerald-500" />
                            Live Statistics
                        </h3>
                        <p className="text-[10px] text-textMuted dark:text-gray-400">
                            Current database figures cached locally for AI context:
                        </p>
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-gray-50 dark:border-slate-850 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-textMuted uppercase">Revenue</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                                {kpis?.total_sales_amount || 'Rs 1,245,630'}
                            </span>
                        </div>
                        
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-gray-50 dark:border-slate-850 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-textMuted uppercase">Low Stock</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${kpis?.low_stock_count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                {kpis?.low_stock_count || 12} items
                            </span>
                        </div>
                        
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-gray-50 dark:border-slate-850 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-textMuted uppercase">Sales Goal</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
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
