import React, { useState } from 'react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { 
    Home, 
    Layers, 
    BarChart2, 
    Package, 
    CheckSquare, 
    Cpu, 
    Users, 
    DollarSign, 
    GitBranch, 
    Settings, 
    FileText, 
    Compass, 
    Search,
    Bell,
    Mail,
    LogOut,
    ArrowRight,
    ArrowUpRight,
    TrendingUp,
    Briefcase,
    Calendar,
    Activity,
    Smartphone,
    Watch,
    Laptop
} from 'lucide-react';

const chartData = [
    { name: 'Jan', Revenue: 18000, Expenses: 12000 },
    { name: 'Feb', Revenue: 22000, Expenses: 14000 },
    { name: 'Mar', Revenue: 20000, Expenses: 13000 },
    { name: 'Apr', Revenue: 25000, Expenses: 15000 },
    { name: 'May', Revenue: 48800, Expenses: 19000 },
    { name: 'Jun', Revenue: 30000, Expenses: 18000 },
    { name: 'Jul', Revenue: 34000, Expenses: 20000 },
    { name: 'Aug', Revenue: 32000, Expenses: 17000 },
    { name: 'Sep', Revenue: 40000, Expenses: 22000 },
    { name: 'Oct', Revenue: 38000, Expenses: 21000 },
    { name: 'Nov', Revenue: 45000, Expenses: 23000 },
    { name: 'Dec', Revenue: 42000, Expenses: 24000 },
];

const trafficData = [
    { name: 'Mon', Direct: 420, Organic: 310 },
    { name: 'Tue', Direct: 580, Organic: 490 },
    { name: 'Wed', Direct: 510, Organic: 430 },
    { name: 'Thu', Direct: 690, Organic: 580 },
    { name: 'Fri', Direct: 820, Organic: 710 },
    { name: 'Sat', Direct: 390, Organic: 280 },
    { name: 'Sun', Direct: 450, Organic: 340 }
];

const subscriptionData = [
    { id: '#9321', name: 'John Carter', email: 'john@acme.com', date: 'Mar 30 2023', location: 'New York, US', plan: 'Enterprise', status: 'Active', amount: '$230.00', initials: 'JC', grad: 'from-blue-500 to-indigo-500' },
    { id: '#9320', name: 'Sophie Moore', email: 'soph@web.com', date: 'Mar 28 2023', location: 'Los Angeles, CA', plan: 'Professional', status: 'Enabled', amount: '$99.00', initials: 'SM', grad: 'from-purple-500 to-pink-500' },
    { id: '#9319', name: 'Matt Carter', email: 'matt@carter.com', date: 'Mar 25 2023', location: 'San Francisco, CA', plan: 'Professional', status: 'Active', amount: '$99.00', initials: 'MC', grad: 'from-emerald-500 to-teal-500' },
    { id: '#9318', name: 'Grace Moore', email: 'grace@moore.org', date: 'Mar 24 2023', location: 'Chicago, IL', plan: 'Basic', status: 'Enabled', amount: '$49.00', initials: 'GM', grad: 'from-orange-500 to-red-500' },
    { id: '#9317', name: 'Lily Reeds', email: 'lily@reeds.co', date: 'Mar 22 2023', location: 'Boston, MA', plan: 'Enterprise', status: 'Active', amount: '$230.00', initials: 'LR', grad: 'from-violet-500 to-purple-500' }
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const val = payload[0].value;
        const formattedVal = `$${(val / 1000).toFixed(1)}K`;
        
        let displayVal = formattedVal;
        let dateLabel = `${label} 04, 2025`;
        let trend = '▲+3.4%';
        
        if (label === 'May') {
            displayVal = '$48.8K';
            trend = '▲+5.6%';
            dateLabel = 'May 04, 2025';
        } else if (label === 'Jan') {
            trend = '▲+1.2%';
        } else if (label === 'Feb') {
            trend = '▲+2.1%';
        } else if (label === 'Mar') {
            trend = '▼-0.8%';
        } else if (label === 'Jun') {
            trend = '▼-1.4%';
        } else if (label === 'Jul') {
            trend = '▲+4.2%';
        }
        
        const isPositive = !trend.startsWith('▼');

        return (
            <div 
                className="p-3 border flex flex-col select-none text-[12px]"
                style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{displayVal}</span>
                    <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                        isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                        {trend}
                    </span>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium">{dateLabel}</span>
            </div>
        );
    }
    return null;
};

const DemoShell = () => {
    const [activeTab, setActiveTab] = useState('Month');
    const [activeItem, setActiveItem] = useState('Reports');
    const [searchQuery, setSearchQuery] = useState('');
    const [trafficTab, setTrafficTab] = useState('Direct');
    const [activeIndex, setActiveIndex] = useState(null);
    const [subSearchQuery, setSubSearchQuery] = useState('');

    // Nav sections configuration
    const navGroups = [
        {
            label: '',
            items: [
                { id: 'Home', label: 'Home', icon: Home },
                { id: 'All pages', label: 'All pages', icon: Layers }
            ]
        },
        {
            label: 'Reports',
            items: [
                { id: 'Reports', label: 'Reports', icon: BarChart2 },
                { id: 'Products', label: 'Products', icon: Package },
                { id: 'Tasks', label: 'Tasks', icon: CheckSquare }
            ]
        },
        {
            label: 'Management',
            items: [
                { id: 'Features', label: 'Features', icon: Cpu },
                { id: 'Users', label: 'Users', icon: Users },
                { id: 'Pricing', label: 'Pricing', icon: DollarSign },
                { id: 'Integrations', label: 'Integrations', icon: GitBranch },
                { id: 'Settings', label: 'Settings', icon: Settings },
                { id: 'Utility pages', label: 'Utility pages', icon: FileText },
                { id: 'Wild free pages', label: 'Wild free pages', icon: Compass }
            ]
        }
    ];

    const getFilteredItems = (items) => {
        if (!searchQuery) return items;
        return items.filter(item => 
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    return (
        <div className="min-h-screen flex bg-[var(--bg-page)] text-[var(--text-primary)] font-sans antialiased">
            
            {/* LEFT SIDEBAR */}
            <aside 
                className="w-[240px] fixed top-0 bottom-0 left-0 flex flex-col justify-between border-r border-[var(--border)] z-40"
                style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
                {/* Top Section */}
                <div className="flex flex-col p-5 pb-2">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-6 select-none">
                        <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <span className="font-extrabold text-base tracking-wider font-brand">DX</span>
                        </div>
                        <span className="font-brand font-bold text-base tracking-tight text-[var(--text-primary)]">
                            Dashbrd X
                        </span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search dashboard..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg outline-none transition-all"
                            style={{
                                background: '#0F1729',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>

                {/* Nav Scroll Area */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin">
                    {navGroups.map((group, groupIdx) => {
                        const filteredItems = getFilteredItems(group.items);
                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={groupIdx} className="space-y-1">
                                {group.label && (
                                    <h4 className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">
                                        {group.label}
                                    </h4>
                                )}
                                <div className="space-y-[2px]">
                                    {filteredItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = activeItem === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveItem(item.id)}
                                                className={`
                                                    w-full flex items-center gap-3 px-3.5 py-2 text-[13px] font-medium rounded-md
                                                    transition-all duration-150 relative group cursor-pointer
                                                    ${isActive 
                                                        ? 'bg-[rgba(59,130,246,0.12)] text-[var(--accent)] font-semibold border-l-[3px] border-[var(--accent)] rounded-l-none' 
                                                        : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]'
                                                    }
                                                `}
                                            >
                                                <Icon className={`w-[16px] h-[16px] shrink-0 transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
                                                <span className="truncate">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Section */}
                <div className="p-4 border-t border-[var(--border)] bg-[rgba(15,23,41,0.2)] space-y-4">
                    {/* User profile row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center font-bold text-xs text-white border border-[var(--border)] shadow-inner">
                                JC
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-[var(--text-primary)] leading-none">
                                    John Carter
                                </span>
                                <span className="text-[10px] text-[var(--text-secondary)] mt-[2px]">
                                    Administrator
                                </span>
                            </div>
                        </div>

                        {/* Icon utilities */}
                        <div className="flex items-center gap-1.5">
                            <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-all cursor-pointer">
                                <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-all cursor-pointer">
                                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                        </div>
                    </div>

                    {/* Blue CTA Button */}
                    <button className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-glow)] text-white rounded-lg shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all cursor-pointer accent-glow">
                        <span>Get template</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className="flex-1 ml-[240px] bg-[var(--bg-page)] min-h-screen flex flex-col">
                
                {/* STICKY TOP HEADER */}
                <header 
                    className="sticky top-0 z-30 h-[52px] px-6 border-b border-[var(--border)] flex items-center justify-between select-none"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                >
                    {/* Left: Breadcrumb + Filter Dropdowns */}
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                            Dashboard &gt; {activeItem}
                        </span>
                        
                        <div className="h-4 w-[1px] bg-[var(--border)]" />
                        
                        {/* Filter Dropdowns */}
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                                <span>All reports</span>
                                <span className="text-[10px] opacity-75">▼</span>
                            </button>
                            
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                                <span>2024 - 2025</span>
                                <span className="text-[10px] opacity-75">▼</span>
                            </button>
                        </div>
                    </div>

                    {/* Right side (flex row, gap 12px) */}
                    <div className="flex items-center gap-3">
                        {/* Blue pill button "Create report" */}
                        <button 
                            className="text-xs font-semibold text-white px-4 py-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer accent-glow"
                            style={{ 
                                backgroundColor: 'var(--accent)',
                                borderRadius: '20px'
                            }}
                        >
                            Create report
                        </button>

                        {/* Notification bell icon button */}
                        <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] rounded-full transition-all cursor-pointer">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        </button>

                        {/* User avatar circle (32px) */}
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center font-bold text-xs text-white border border-[var(--border)] shadow-inner select-none cursor-pointer">
                            JC
                        </div>
                    </div>
                </header>

                {/* Content Panel (Padded) */}
                <div className="flex-1 p-[24px_28px] flex flex-col">
                    {activeItem === 'Reports' ? (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            
                             {/* KPI Metrics Row (No borders, inline with dividers) */}
                            <div className="flex items-center justify-between py-4 border-b border-[var(--border)] pb-6 select-none animate-fade-up delay-0">
                                {/* Block 1 */}
                                <div className="flex-1 flex flex-col items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-none">60.8K</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] select-none">
                                            ▲+8.2%
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">Page views</span>
                                </div>
                                
                                {/* Divider 1 */}
                                <div className="w-[1px] h-10 bg-[var(--border)] shrink-0" />

                                {/* Block 2 */}
                                <div className="flex-1 flex flex-col items-center">
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-none">20.6K</span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.15)] text-[#EF4444] select-none">
                                                ▼-2.4%
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">Monthly users</span>
                                    </div>
                                </div>

                                {/* Divider 2 */}
                                <div className="w-[1px] h-10 bg-[var(--border)] shrink-0" />

                                {/* Block 3 */}
                                <div className="flex-1 flex flex-col items-center">
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-none">756</span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] select-none">
                                                ▲+14.8%
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">New subscriptions</span>
                                    </div>
                                </div>

                                {/* Divider 3 */}
                                <div className="w-[1px] h-10 bg-[var(--border)] shrink-0" />

                                {/* Block 4 */}
                                <div className="flex-1 flex flex-col items-end">
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-none">10min</span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981] select-none">
                                                ▲+3.1%
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">Average visit duration</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chart & Activity panels */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Main Revenue Area Chart Card */}
                                <div className="lg:col-span-2 bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col justify-between animate-fade-up delay-80">
                                    {/* Header Row */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div className="space-y-1">
                                            <span className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                                Total balance
                                            </span>
                                            <div className="flex items-baseline gap-3">
                                                <span className="font-brand text-[32px] font-bold text-[var(--text-primary)] tracking-tight leading-none">
                                                    $240.8K
                                                </span>
                                                {/* Sub-labels */}
                                                <div className="flex items-center gap-3 ml-2">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-medium">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                                                        <span>Revenue</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-medium">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#1C2A45]" />
                                                        <span>Expenses</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tab pills */}
                                        <div className="flex bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-0.5 self-start md:self-center">
                                            {['Year', 'Month', 'Week', 'Day'].map(tab => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                                        activeTab === tab 
                                                            ? 'bg-[var(--accent)] text-white shadow-sm' 
                                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                    }`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recharts AreaChart container */}
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={chartData}
                                                margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid 
                                                    vertical={false} 
                                                    strokeDasharray="3 3" 
                                                    stroke="var(--border)"
                                                />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
                                                />
                                                <YAxis 
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                                                
                                                {/* Expenses Area */}
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="Expenses" 
                                                    stroke="#1C2A45" 
                                                    fill="rgba(28,42,69,0.3)" 
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 4, fill: '#1C2A45', stroke: '#fff', strokeWidth: 2 }}
                                                    animationDuration={1400}
                                                />
                                                
                                                {/* Revenue Area */}
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="Revenue" 
                                                    stroke="#3B82F6" 
                                                    fill="url(#blueGrad)" 
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                                                    animationDuration={1400}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Recent Tasks Card */}
                                <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col justify-between animate-fade-up delay-160">
                                    <div className="flex justify-between items-center mb-5">
                                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Critical Tasks</h3>
                                        <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                            3 pending
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        {[
                                            { label: 'Optimize SQL Ledger indexes', done: true, time: 'Completed' },
                                            { label: 'Integrate Stripe hooks API', done: false, time: 'Due today' },
                                            { label: 'Audit settings configuration', done: false, time: '2 days left' },
                                            { label: 'Setup Space Grotesk fonts', done: true, time: 'Completed' }
                                        ].map((task, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-2 hover:bg-slate-800/20 rounded-lg transition-all">
                                                <input 
                                                    type="checkbox" 
                                                    checked={task.done} 
                                                    readOnly 
                                                    className="mt-0.5 rounded border-slate-700 bg-slate-850 text-blue-500 focus:ring-0 cursor-pointer"
                                                />
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-semibold ${task.done ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                                                        {task.label}
                                                    </span>
                                                    <span className="text-[9px] text-[var(--text-secondary)] mt-0.5">
                                                        {task.time}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Circular Gauge / Donut Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                
                                {/* Card 1: Users by software */}
                                <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col items-center justify-between min-h-[300px] animate-fade-up delay-240">
                                    <div className="w-full flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                            Users by software
                                        </h3>
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">Live count</span>
                                    </div>

                                    {/* Donut SVG */}
                                    <div className="relative w-[180px] h-[180px] flex items-center justify-center">
                                        <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
                                            {/* Outer Ring */}
                                            <circle cx="90" cy="90" r="80" fill="transparent" stroke="var(--bg-elevated)" strokeWidth="8" />
                                            <circle 
                                                cx="90" cy="90" r="80" 
                                                fill="transparent" 
                                                stroke="#3B82F6" 
                                                strokeWidth="8" 
                                                strokeDasharray="502.65" 
                                                strokeDashoffset="0" 
                                                strokeLinecap="round" 
                                                style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }}
                                            />

                                            {/* Mid Ring */}
                                            <circle cx="90" cy="90" r="66" fill="transparent" stroke="var(--bg-elevated)" strokeWidth="8" />
                                            <circle 
                                                cx="90" cy="90" r="66" 
                                                fill="transparent" 
                                                stroke="#1D4ED8" 
                                                strokeWidth="8" 
                                                strokeDasharray="414.69" 
                                                strokeDashoffset="103.67" 
                                                strokeLinecap="round" 
                                                style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.4))' }}
                                            />

                                            {/* Inner Ring */}
                                            <circle cx="90" cy="90" r="52" fill="transparent" stroke="var(--bg-elevated)" strokeWidth="8" />
                                            <circle 
                                                cx="90" cy="90" r="52" 
                                                fill="transparent" 
                                                stroke="#1E3A6E" 
                                                strokeWidth="8" 
                                                strokeDasharray="326.73" 
                                                strokeDashoffset="163.36" 
                                                strokeLinecap="round" 
                                                style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.3))' }}
                                            />
                                        </svg>
                                        
                                        {/* Center Text */}
                                        <div className="absolute flex flex-col items-center justify-center">
                                            <span className="text-[22px] font-bold text-white leading-none">24,648</span>
                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mt-1">Total Users</span>
                                        </div>
                                    </div>

                                    {/* Stats Below Chart */}
                                    <div className="w-full grid grid-cols-3 gap-2 mt-6 border-t border-[var(--border)] pt-4">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                                                <span className="text-[12px] font-bold text-[var(--text-primary)]">16,264</span>
                                            </div>
                                            <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Macbook users</span>
                                        </div>
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
                                                <span className="text-[12px] font-bold text-[var(--text-primary)]">5,546</span>
                                            </div>
                                            <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Apple users</span>
                                        </div>
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#1E3A6E]" />
                                                <span className="text-[12px] font-bold text-[var(--text-primary)]">2,478</span>
                                            </div>
                                            <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Like users</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Customers overview */}
                                <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col justify-between min-h-[300px] animate-fade-up delay-320">
                                    <div className="w-full flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                            Customers overview
                                        </h3>
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">Demographics</span>
                                    </div>

                                    {/* Flex container layout: Chart on left, Stats on right */}
                                    <div className="flex-1 flex items-center justify-around gap-6 py-2">
                                        {/* Donut SVG */}
                                        <div className="relative w-[140px] h-[140px] flex items-center justify-center shrink-0">
                                            <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                                                {/* Outer Ring */}
                                                <circle cx="70" cy="70" r="60" fill="transparent" stroke="var(--bg-elevated)" strokeWidth="7" />
                                                <circle 
                                                    cx="70" cy="70" r="60" 
                                                    fill="transparent" 
                                                    stroke="#3B82F6" 
                                                    strokeWidth="7" 
                                                    strokeDasharray="376.99" 
                                                    strokeDashoffset="0" 
                                                    strokeLinecap="round" 
                                                    style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }}
                                                />

                                                {/* Mid Ring */}
                                                <circle cx="70" cy="70" r="49" fill="transparent" stroke="var(--bg-elevated)" strokeWidth="7" />
                                                <circle 
                                                    cx="70" cy="70" r="49" 
                                                    fill="transparent" 
                                                    stroke="#1D4ED8" 
                                                    strokeWidth="7" 
                                                    strokeDasharray="307.88" 
                                                    strokeDashoffset="76.97" 
                                                    strokeLinecap="round" 
                                                    style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.4))' }}
                                                />

                                                {/* Inner Ring */}
                                                <circle cx="70" cy="70" r="38" fill="transparent" stroke="var(--bg-elevated)" strokeWidth="7" />
                                                <circle 
                                                    cx="70" cy="70" r="38" 
                                                    fill="transparent" 
                                                    stroke="#1E3A6E" 
                                                    strokeWidth="7" 
                                                    strokeDasharray="238.76" 
                                                    strokeDashoffset="119.38" 
                                                    strokeLinecap="round" 
                                                    style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.3))' }}
                                                />
                                            </svg>
                                            
                                            {/* Center Text */}
                                            <div className="absolute flex flex-col items-center justify-center">
                                                <span className="text-[20px] font-bold text-white leading-none">12,624</span>
                                            </div>
                                        </div>

                                        {/* Stats Beside Chart */}
                                        <div className="flex flex-col gap-4 self-center pr-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                                                    <span className="text-[13px] font-bold text-[var(--text-primary)]">8,548</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Male customers</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]" />
                                                    <span className="text-[13px] font-bold text-[var(--text-primary)]">2,132</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Female customers</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A6E]" />
                                                    <span className="text-[13px] font-bold text-[var(--text-primary)]">1,944</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Premium users</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Featured products */}
                                <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col justify-between min-h-[300px] animate-fade-up delay-400">
                                    <div className="w-full flex justify-between items-center mb-4 select-none">
                                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                            Featured products
                                        </h3>
                                        {/* Date filter pill */}
                                        <button className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                                            <span>All 2024</span>
                                            <span className="text-[9px] opacity-75">▼</span>
                                        </button>
                                    </div>

                                    {/* Product Rows List */}
                                    <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                                        {[
                                            { 
                                                name: 'iPhone 15 Pro Max', 
                                                price: '$999 USD', 
                                                icon: Smartphone, 
                                                iconColor: 'text-blue-400',
                                                bgGlow: 'rgba(59,130,246,0.1)'
                                            },
                                            { 
                                                name: 'Apple Watch Series 8', 
                                                price: '$399 USD', 
                                                icon: Watch, 
                                                iconColor: 'text-indigo-400',
                                                bgGlow: 'rgba(99,102,241,0.1)'
                                            },
                                            { 
                                                name: 'MacBook M2', 
                                                price: '$1,299 USD', 
                                                icon: Laptop, 
                                                iconColor: 'text-purple-400',
                                                bgGlow: 'rgba(168,85,247,0.1)'
                                            }
                                        ].map((product, idx) => {
                                            const ProductIcon = product.icon;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="flex items-center gap-3.5 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-all duration-150 group cursor-pointer"
                                                >
                                                    {/* Dark square thumbnail */}
                                                    <div 
                                                        className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                                                        style={{ 
                                                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                                                        }}
                                                    >
                                                        <div 
                                                            className="w-7 h-7 rounded-md flex items-center justify-center"
                                                            style={{ backgroundColor: product.bgGlow }}
                                                        >
                                                            <ProductIcon className={`w-4 h-4 ${product.iconColor}`} />
                                                        </div>
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 flex flex-col min-w-0">
                                                        <span className="text-[13px] font-bold text-[var(--text-primary)] truncate leading-snug">
                                                            {product.name}
                                                        </span>
                                                        <span className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-none">
                                                            {product.price}
                                                        </span>
                                                    </div>

                                                    {/* Visual Indicator */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pr-1 text-[var(--accent)]">
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>

                            {/* Third Row: Web Traffic & Platform Sources */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                
                                {/* Card 3: Web Traffic */}
                                <div className="lg:col-span-2 bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col justify-between min-h-[260px] animate-fade-up delay-480">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 select-none">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                                Web traffic
                                            </h3>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                                Active
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 self-start sm:self-center">
                                            {/* Toggle tabs */}
                                            <div className="flex bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-0.5">
                                                {['Direct', 'Organic search'].map(tab => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setTrafficTab(tab)}
                                                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                                                            trafficTab === tab 
                                                                ? 'bg-[var(--accent)] text-white shadow-sm' 
                                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                    >
                                                        {tab}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Week dropdown */}
                                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                                                <span>Week</span>
                                                <span className="text-[10px] opacity-75">▼</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Recharts BarChart */}
                                    <div className="h-[160px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={trafficData}
                                                margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                                            >
                                                <XAxis 
                                                    dataKey="name" 
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 500 }}
                                                />
                                                <Tooltip 
                                                    cursor={{ fill: 'transparent' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div 
                                                                    className="p-2 border text-center select-none text-[12px]"
                                                                    style={{
                                                                        backgroundColor: 'var(--bg-elevated)',
                                                                        borderColor: 'var(--border)',
                                                                        borderRadius: '10px',
                                                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                                                                    }}
                                                                >
                                                                    <span className="text-xs font-bold text-white block">
                                                                        {payload[0].value} Visits
                                                                    </span>
                                                                    <span className="text-[9px] text-[var(--text-secondary)] font-medium block mt-0.5">
                                                                        {payload[0].name}
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar 
                                                    dataKey={trafficTab === 'Direct' ? 'Direct' : 'Organic'} 
                                                    radius={[4, 4, 0, 0]}
                                                    background={{ fill: 'var(--bg-elevated)', radius: [4, 4, 0, 0] }}
                                                    animationDuration={800}
                                                >
                                                    {trafficData.map((entry, index) => {
                                                        const isHovered = activeIndex === index;
                                                        return (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={isHovered ? '#60A5FA' : '#3B82F6'}
                                                                style={isHovered ? { filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' } : {}}
                                                                onMouseEnter={() => setActiveIndex(index)}
                                                                onMouseLeave={() => setActiveIndex(null)}
                                                                className="transition-all duration-150"
                                                            />
                                                        );
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Card 4: Platform Sources */}
                                <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col justify-between min-h-[260px] animate-fade-up delay-560">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                            Platform sources
                                        </h3>
                                        <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Share</span>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-center gap-3.5">
                                        {[
                                            { name: 'Google Search', count: '12.4K clicks', percent: '62%' },
                                            { name: 'Direct URL', count: '8.2K entries', percent: '28%' },
                                            { name: 'GitHub Referrals', count: '3.1K clicks', percent: '8%' },
                                            { name: 'Twitter Ads', count: '1.4K entries', percent: '2%' }
                                        ].map((source, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-[var(--text-primary)]">{source.name}</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">{source.count}</span>
                                                </div>
                                                <span className="font-bold text-[var(--text-primary)]">{source.percent}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Fourth Row: Recent Orders Data Table */}
                            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-md mt-6 overflow-hidden select-none animate-fade-up delay-640">
                                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                        Recent orders
                                    </h3>
                                    <button className="text-[11px] font-bold text-[var(--accent)] hover:underline cursor-pointer">
                                        View all orders
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--border)] bg-[rgba(15,23,41,0.15)]">
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-bold">NAME</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-bold">PRICE</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] font-bold">STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {[
                                                { name: 'John Camp', product: 'Pixel 9 Pro Max', price: '$950.00', status: 'Delivered', initials: 'JC', grad: 'from-blue-500 to-cyan-500' },
                                                { name: 'Grace Moore', product: 'Apple Watch SE', price: '$329.00', status: 'Delivered', initials: 'GM', grad: 'from-purple-500 to-pink-500' },
                                                { name: 'Matt Carter', product: 'MacBook M3', price: '$1,199.00', status: 'Delivered', initials: 'MC', grad: 'from-emerald-500 to-teal-500' },
                                                { name: 'Lily Reeds', product: 'Pixel 12 Tri', price: '$1,290.00', status: 'Demand', initials: 'LR', grad: 'from-orange-500 to-amber-500' },
                                                { name: 'Sophia Vance', product: 'iPhone 16 Pro', price: '$999.00', status: 'Delivered', initials: 'SV', grad: 'from-indigo-500 to-blue-500' }
                                            ].map((row, idx) => (
                                                <tr key={idx} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-150">
                                                    {/* NAME column */}
                                                    <td className="p-[12px_24px]">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${row.grad} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                                                                {row.initials}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-semibold text-[var(--text-primary)]">{row.name}</span>
                                                                <span className="text-[12px] text-[var(--text-secondary)] mt-0.5">{row.product}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* PRICE column */}
                                                    <td className="p-[12px_24px] text-[13px] font-bold text-[var(--text-primary)]">
                                                        {row.price}
                                                    </td>
                                                    
                                                    {/* STATUS column */}
                                                    <td className="p-[12px_24px]">
                                                        <span 
                                                            className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full select-none"
                                                            style={{
                                                                backgroundColor: row.status === 'Delivered' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                                color: row.status === 'Delivered' ? '#10B981' : '#EF4444'
                                                            }}
                                                        >
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Fifth Row: Subscriptions Data Table */}
                            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-md mt-6 overflow-hidden select-none animate-fade-up delay-720">
                                <div className="p-6 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider shrink-0">
                                            Subscriptions
                                        </h3>
                                        <div className="relative w-60">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                            <input
                                                type="text"
                                                placeholder="Search subscriptions..."
                                                value={subSearchQuery}
                                                onChange={(e) => setSubSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg outline-none transition-all"
                                                style={{
                                                    background: '#0F1729',
                                                    border: '1px solid var(--border)',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start md:self-center">
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                                            <span>Date</span>
                                            <span className="text-[10px] opacity-75">▼</span>
                                        </button>
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                                            <span>Customer</span>
                                            <span className="text-[10px] opacity-75">▼</span>
                                        </button>
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">
                                            <span>Customer</span>
                                            <span className="text-[10px] opacity-75">▼</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold">#</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold">NAME</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold">EMAIL</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold">DATE</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold">LOCATION</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold">PLAN</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold">STATUS</th>
                                                <th className="p-[12px_24px] text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] font-bold text-right">AMOUNT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {subscriptionData
                                                .filter(sub => {
                                                    if (!subSearchQuery) return true;
                                                    const query = subSearchQuery.toLowerCase();
                                                    return (
                                                        sub.name.toLowerCase().includes(query) ||
                                                        sub.email.toLowerCase().includes(query) ||
                                                        sub.id.toLowerCase().includes(query) ||
                                                        sub.location.toLowerCase().includes(query) ||
                                                        sub.plan.toLowerCase().includes(query)
                                                    );
                                                })
                                                .map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-150">
                                                        {/* # column */}
                                                        <td className="p-[12px_24px] text-[11px] text-[var(--text-secondary)] font-mono">
                                                            {row.id}
                                                        </td>
                                                        
                                                        {/* NAME column */}
                                                        <td className="p-[12px_24px]">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${row.grad} flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm`}>
                                                                    {row.initials}
                                                                </div>
                                                                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                                                                    {row.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        
                                                        {/* EMAIL column */}
                                                        <td className="p-[12px_24px] text-[12px] text-[var(--text-secondary)]">
                                                            {row.email}
                                                        </td>
                                                        
                                                        {/* DATE column */}
                                                        <td className="p-[12px_24px] text-[12px] text-[var(--text-secondary)]">
                                                            {row.date}
                                                        </td>
                                                        
                                                        {/* LOCATION column */}
                                                        <td className="p-[12px_24px] text-[12px] text-[var(--text-secondary)]">
                                                            {row.location}
                                                        </td>
                                                        
                                                        {/* PLAN column */}
                                                        <td className="p-[12px_24px] text-[12px] text-[var(--text-primary)] font-medium">
                                                            {row.plan}
                                                        </td>
                                                        
                                                        {/* STATUS column */}
                                                        <td className="p-[12px_24px]">
                                                            <span 
                                                                className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full select-none"
                                                                style={{
                                                                    backgroundColor: row.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                                                                    color: row.status === 'Active' ? '#10B981' : '#3B82F6'
                                                                }}
                                                            >
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        
                                                        {/* AMOUNT column */}
                                                        <td className="p-[12px_24px] text-[13px] font-bold text-[var(--text-primary)] text-right">
                                                            {row.amount}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Footer: Pagination & details */}
                                <div className="p-[14px_24px] border-t border-[var(--border)] bg-[rgba(15,23,41,0.1)] flex items-center justify-between">
                                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                                        Showing {subscriptionData.filter(sub => {
                                            if (!subSearchQuery) return true;
                                            const query = subSearchQuery.toLowerCase();
                                            return (
                                                sub.name.toLowerCase().includes(query) ||
                                                sub.email.toLowerCase().includes(query) ||
                                                sub.id.toLowerCase().includes(query) ||
                                                sub.location.toLowerCase().includes(query) ||
                                                sub.plan.toLowerCase().includes(query)
                                            );
                                        }).length} of {subscriptionData.length} entries
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button className="px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.02)] transition-all cursor-pointer select-none">
                                            Previous
                                        </button>
                                        <button className="px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.02)] transition-all cursor-pointer select-none">
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-md animate-in zoom-in-95 duration-200">
                            <div className="p-3 bg-slate-800/40 rounded-full text-[var(--accent)] mb-4 animate-bounce">
                                <Compass className="w-8 h-8" />
                            </div>
                            <h2 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wider">{activeItem} Panel</h2>
                            <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-2">
                                Dynamic rendering for "{activeItem}" is loaded. Our layout margin and spacing tokens are verified and active on this screen.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer info */}
                <footer className="mt-8 pt-4 border-t border-[var(--border)] flex justify-between items-center text-[10px] text-[var(--text-secondary)]">
                    <span>© 2026 Dashbrd X. All rights reserved.</span>
                    <div className="flex gap-4">
                        <a href="#privacy" className="hover:underline">Privacy Policy</a>
                        <a href="#terms" className="hover:underline">Terms of Service</a>
                    </div>
                </footer>

            </main>
        </div>
    );
};

export default DemoShell;
