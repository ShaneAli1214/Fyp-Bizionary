import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, FileText, Plus } from 'lucide-react';
import { accountsApi } from '../../services/accountsApi';
import { formatPKR } from '../../utils/currency';
import RevenuesTab from './components/RevenuesTab';
import ExpensesTab from './components/ExpensesTab';
import InvoicesTab from './components/InvoicesTab';
import RecordModal from './components/RecordModal';

const AccountsManager = () => {
    const [activeTab, setActiveTab] = useState('revenues');
    const [kpis, setKpis] = useState(null);
    const [loadingKpis, setLoadingKpis] = useState(true);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

    useEffect(() => {
        const fetchKpis = async () => {
            try {
                setLoadingKpis(true);
                const res = await accountsApi.getKpis();
                if (res.data?.success) {
                    setKpis(res.data.data);
                }
            } catch (error) {
                console.warn('Failed to fetch accounts KPIs.');
                setKpis({
                    total_revenue: 0,
                    total_expense: 0,
                    net_profit: 0,
                    cash_flow: 0
                });
            } finally {
                setLoadingKpis(false);
            }
        };

        fetchKpis();
    }, [refreshTrigger]);

    const handleAddRecord = () => {
        setSelectedRecord(null);
        setIsModalOpen(true);
    };

    const handleEditRecord = (record) => {
        setSelectedRecord(record);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">Accounts & Finance</h1>
                    <p className="text-sm text-textMuted mt-1">Manage revenues, expenses, and invoices in one place.</p>
                </div>
                <button 
                    onClick={handleAddRecord}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg shadow-sm hover:bg-primaryDark hover:shadow-primary/40"
                >
                    <Plus className="w-5 h-5" />
                    Add New Record
                </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-textMuted font-medium">Total Revenue</p>
                        <h4 className="text-lg font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.total_revenue || 0)}
                        </h4>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-textMuted font-medium">Total Expenses</p>
                        <h4 className="text-lg font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.total_expense || 0)}
                        </h4>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-textMuted font-medium">Net Profit</p>
                        <h4 className="text-lg font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.net_profit || 0)}
                        </h4>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-textMuted font-medium">Cash Flow</p>
                        <h4 className="text-lg font-bold text-slate-900">
                            {loadingKpis ? '...' : formatPKR(kpis?.cash_flow || 0)}
                        </h4>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="flex border-b border-gray-100 px-6 pt-4 gap-6">
                    <button
                        onClick={() => setActiveTab('revenues')}
                        className={`pb-4 font-semibold text-sm transition-colors relative ${activeTab === 'revenues' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Revenues
                        {activeTab === 'revenues' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`pb-4 font-semibold text-sm transition-colors relative ${activeTab === 'expenses' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Expenses
                        {activeTab === 'expenses' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`pb-4 font-semibold text-sm transition-colors relative ${activeTab === 'invoices' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Invoices
                        {activeTab === 'invoices' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                </div>

                <div className="p-6 flex-1 bg-slate-50/50">
                    {activeTab === 'revenues' && <RevenuesTab refreshTrigger={refreshTrigger} onEdit={handleEditRecord} triggerRefresh={triggerRefresh} />}
                    {activeTab === 'expenses' && <ExpensesTab refreshTrigger={refreshTrigger} onEdit={handleEditRecord} triggerRefresh={triggerRefresh} />}
                    {activeTab === 'invoices' && <InvoicesTab refreshTrigger={refreshTrigger} onEdit={handleEditRecord} triggerRefresh={triggerRefresh} />}
                </div>
            </div>

            <RecordModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                recordType={activeTab} 
                record={selectedRecord}
                triggerRefresh={triggerRefresh}
            />
        </div>
    );
};

export default AccountsManager;
