import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, ChevronDown, ChevronRight, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { accountsApi } from '../../../services/accountsApi';
import { formatPKR } from '../../../utils/currency';

const AccountNode = ({ node, level = 0, expandedNodes, toggleExpand }) => {
    const isGroup = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];
    
    // Color scheme based on account type
    const getTypeColor = (type) => {
        switch(type) {
            case 'ASSET': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
            case 'LIABILITY': return 'text-rose-750 bg-rose-50 border-rose-100';
            case 'EQUITY': return 'text-violet-750 bg-violet-50 border-violet-100';
            case 'REVENUE': return 'text-blue-750 bg-blue-50 border-blue-100';
            case 'EXPENSE': return 'text-amber-750 bg-amber-50 border-amber-100';
            default: return 'text-slate-650 bg-slate-50 border-slate-100';
        }
    };

    return (
        <div className="select-none">
            <div 
                className={`flex items-center justify-between p-2.5 my-1 rounded-xl transition-all border border-transparent hover:border-slate-200/60 hover:bg-slate-50/85 cursor-pointer`}
                style={{ marginLeft: `${level * 24}px` }}
                onClick={() => isGroup && toggleExpand(node.id)}
            >
                <div className="flex items-center gap-2.5">
                    {isGroup ? (
                        <button className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    ) : (
                        <div className="w-5" /> // spacing spacer
                    )}
                    
                    {isGroup ? (
                        isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-primary" />
                        ) : (
                            <Folder className="w-4 h-4 text-primary/80" />
                        )
                    ) : (
                        <FileText className="w-4 h-4 text-slate-400" />
                    )}

                    <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {node.code}
                    </span>
                    <span className={`text-sm font-bold ${isGroup ? 'text-slate-800' : 'text-slate-600'}`}>
                        {node.name}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTypeColor(node.account_type)}`}>
                        {node.account_type}
                    </span>
                    <span className={`text-sm font-bold font-mono ${node.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatPKR(node.balance)}
                    </span>
                </div>
            </div>

            {isGroup && isExpanded && (
                <div className="transition-all duration-300 animate-in slide-in-from-top-2">
                    {node.children.map(child => (
                        <AccountNode 
                            key={child.id} 
                            node={child} 
                            level={level + 1} 
                            expandedNodes={expandedNodes} 
                            toggleExpand={toggleExpand} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const COATreeTab = ({ refreshTrigger, dateRange }) => {
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState({});

    const fetchTree = async () => {
        try {
            setLoading(true);
            const res = await accountsApi.getCOATree(dateRange);
            if (res.data?.success) {
                setTreeData(res.data.data);
                
                // By default, expand top level nodes
                const defaultExpanded = {};
                res.data.data.forEach(node => {
                    defaultExpanded[node.id] = true;
                });
                setExpandedNodes(defaultExpanded);
            }
        } catch (error) {
            console.error('Failed to fetch CoA tree:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTree();
    }, [refreshTrigger, dateRange]);

    const toggleExpand = (id) => {
        setExpandedNodes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const expandAll = () => {
        const expanded = {};
        const recurse = (nodes) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    expanded[node.id] = true;
                    recurse(node.children);
                }
            });
        };
        recurse(treeData);
        setExpandedNodes(expanded);
    };

    const collapseAll = () => {
        setExpandedNodes({});
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex gap-2">
                    <button 
                        onClick={expandAll}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        Expand All
                    </button>
                    <button 
                        onClick={collapseAll}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        <EyeOff className="w-3.5 h-3.5" />
                        Collapse All
                    </button>
                </div>
                <button 
                    onClick={fetchTree}
                    className="flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-slate-500 font-bold">Compiling Chart of Accounts ledger balances...</p>
                </div>
            ) : treeData.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 p-6">
                    <p className="text-slate-500 font-bold text-sm">No accounts registered in Chart of Accounts.</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    {treeData.map(node => (
                        <AccountNode 
                            key={node.id} 
                            node={node} 
                            expandedNodes={expandedNodes} 
                            toggleExpand={toggleExpand} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default COATreeTab;
