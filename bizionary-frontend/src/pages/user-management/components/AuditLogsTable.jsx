import React, { useState, useEffect } from 'react';
import {
    Search, RotateCcw, ShieldAlert, Calendar, Info,
    Globe, CheckCircle2, AlertTriangle, Filter, Tag
} from 'lucide-react';
import { userManagementApi } from '../../../services/userManagementApi';

const AuditLogsTable = () => {
    // ── Data states ───────────────────────────────────────────────────────────
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Filter states ─────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // ── Pagination states ─────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // ── Action categories matching backend ActivityLog.ACTION_CHOICES ─────────
    const actionCategories = [
        { value: 'LOGIN',             label: 'Login Sessions' },
        { value: 'LOGOUT',            label: 'Logout Sessions' },
        { value: 'CREATE',            label: 'Resource Creation' },
        { value: 'UPDATE',            label: 'Resource Updates' },
        { value: 'DELETE',            label: 'Resource Deletion' },
        { value: 'PERMISSION_CHANGE', label: 'Permissions Changed' },
        { value: 'ROLE_CHANGE',       label: 'Role Level Changed' },
        { value: 'PASSWORD_CHANGE',   label: 'Password Changes' },
        { value: '2FA_ENABLE',        label: 'MFA Enabled' },
        { value: '2FA_DISABLE',       label: 'MFA Disabled' },
        { value: 'EXPORT',            label: 'Data Export' },
        { value: 'IMPORT',            label: 'Data Import' },
        { value: 'OTHER',             label: 'System Processes' }
    ];

    // ── ERP modules for filter ────────────────────────────────────────────────
    const erpModules = [
        'Products', 'Purchases', 'Sales', 'Accounts',
        'User Management', 'Security', 'Dashboard'
    ];

    // ── Fetch logs ────────────────────────────────────────────────────────────
    const fetchLogs = async () => {
        try {
            setLoading(true);
            setErrorMsg('');

            const params = {
                search:     search      || undefined,
                action:     actionFilter || undefined,
                module:     moduleFilter || undefined,
                status:     statusFilter || undefined,
                from_date:  fromDate    || undefined,
                to_date:    toDate      || undefined,
                page:       currentPage,
                page_size:  pageSize,
            };

            const response = await userManagementApi.getAuditLogs(params);

            if (response.data?.success) {
                setLogs(response.data.data || []);
                setTotalCount(response.data.count || 0);
                setTotalPages(response.data.total_pages || Math.ceil((response.data.count || 0) / pageSize) || 1);
            } else {
                setErrorMsg('Failed to load audit logs.');
            }
        } catch (error) {
            console.error('Failed to fetch system audit logs:', error);
            setErrorMsg(
                error.response?.data?.error ||
                'Access Denied. You must be an Administrator to view system audit logs.'
            );
        } finally {
            setLoading(false);
        }
    };

    // Debounce search, re-fetch on any filter change
    useEffect(() => {
        const timer = setTimeout(() => { fetchLogs(); }, 350);
        return () => clearTimeout(timer);
    }, [search, actionFilter, moduleFilter, statusFilter, fromDate, toDate, currentPage, pageSize]);

    const handleResetFilters = () => {
        setSearch('');
        setActionFilter('');
        setModuleFilter('');
        setStatusFilter('');
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    // ── Action badge colour ───────────────────────────────────────────────────
    const getActionBadgeStyle = (action) => {
        switch (action) {
            case 'LOGIN':
            case '2FA_ENABLE':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'LOGOUT':
            case '2FA_DISABLE':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'CREATE':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'UPDATE':
            case 'ROLE_CHANGE':
            case 'PERMISSION_CHANGE':
            case 'PASSWORD_CHANGE':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'DELETE':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    // ── Module badge colour ───────────────────────────────────────────────────
    const getModuleBadgeStyle = (module) => {
        switch ((module || '').toLowerCase()) {
            case 'products':
                return 'bg-violet-50 text-violet-700 border-violet-200';
            case 'purchases':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'sales':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'accounts':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'user management':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'security':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'dashboard':
                return 'bg-slate-50 text-slate-700 border-slate-200';
            default:
                return 'bg-gray-50 text-gray-500 border-gray-200';
        }
    };

    // ── Timestamp formatter ───────────────────────────────────────────────────
    const formatTimestamp = (ts) => {
        try {
            return new Date(ts).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true
            });
        } catch {
            return ts;
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Filter Bar ── */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">

                {/* Row 1: Search + Action + Module + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative lg:col-span-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            id="audit-search"
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Search name, description…"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] dark:text-slate-200 transition-all"
                        />
                    </div>

                    {/* Action filter */}
                    <div className="relative">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <select
                            id="audit-action-filter"
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] dark:text-slate-200 transition-all appearance-none"
                        >
                            <option value="">All Event Types</option>
                            {actionCategories.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Module filter */}
                    <div className="relative">
                        <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <select
                            id="audit-module-filter"
                            value={moduleFilter}
                            onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] dark:text-slate-200 transition-all appearance-none"
                        >
                            <option value="">All Modules</option>
                            {erpModules.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status filter */}
                    <div className="flex gap-2">
                        <select
                            id="audit-status-filter"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] dark:text-slate-200 transition-all appearance-none"
                        >
                            <option value="">All Statuses</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILURE">Failure</option>
                        </select>
                        <button
                            id="audit-reset-filters"
                            onClick={handleResetFilters}
                            title="Clear all filters"
                            className="p-2.5 text-gray-500 hover:text-[#1C3A5A] bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl transition-all flex items-center justify-center flex-shrink-0"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Row 2: Date Range */}
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        Date Range
                    </span>
                    <input
                        id="audit-from-date"
                        type="date"
                        value={fromDate}
                        onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] transition-all"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                        id="audit-to-date"
                        type="date"
                        value={toDate}
                        onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1C3A5A]/20 focus:border-[#1C3A5A] transition-all"
                    />
                    {(fromDate || toDate) && (
                        <button
                            onClick={() => { setFromDate(''); setToDate(''); setCurrentPage(1); }}
                            className="text-xs text-rose-500 hover:text-rose-700 font-semibold underline underline-offset-2 transition-colors"
                        >
                            Clear dates
                        </button>
                    )}
                </div>
            </div>

            {/* ── Error Alert ── */}
            {errorMsg && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-rose-950/30 text-red-700 dark:text-rose-400 border border-red-100 dark:border-rose-900 flex items-center gap-3 text-sm">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* ── Table ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 flex justify-center items-center flex-col gap-4">
                        <div className="w-10 h-10 rounded-full border-4 border-[#1C3A5A] border-t-transparent animate-spin" />
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                            Retrieving audit logs…
                        </span>
                    </div>
                ) : !logs || logs.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-center mb-5 text-gray-400">
                            <ShieldAlert className="w-8 h-8 text-[#1C3A5A]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
                            No audit entries found
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm">
                            No activity log entries match your current filters.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-700 dark:text-slate-300">
                                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 uppercase text-xs font-bold text-gray-500 dark:text-slate-400 tracking-wider">
                                    <tr>
                                        <th className="px-5 py-4 whitespace-nowrap">Timestamp</th>
                                        <th className="px-5 py-4">Operator</th>
                                        <th className="px-5 py-4 whitespace-nowrap">Event</th>
                                        <th className="px-5 py-4 whitespace-nowrap">Module</th>
                                        <th className="px-5 py-4">Description</th>
                                        <th className="px-5 py-4 whitespace-nowrap">IP Address</th>
                                        <th className="px-5 py-4 whitespace-nowrap">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {logs.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-gray-50/60 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            {/* Timestamp */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span>{formatTimestamp(log.timestamp)}</span>
                                                </div>
                                            </td>

                                            {/* Operator */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#1C3A5A]/10 text-[#1C3A5A] dark:bg-sky-500/10 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold border border-[#1C3A5A]/10 dark:border-sky-500/20 flex-shrink-0">
                                                        {(log.user_name || 'S').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-gray-900 dark:text-slate-100 text-xs truncate">
                                                            {log.user_name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                                                            {log.user_role || log.user_email || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Event type badge */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${getActionBadgeStyle(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>

                                            {/* Module badge */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {log.module ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getModuleBadgeStyle(log.module)}`}>
                                                        {log.module}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">—</span>
                                                )}
                                            </td>

                                            {/* Description */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-start gap-1.5 min-w-[180px] max-w-[320px]">
                                                    <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <span className="text-xs text-gray-700 dark:text-slate-300 font-medium leading-relaxed line-clamp-2">
                                                        {log.description}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* IP Address */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-md w-fit">
                                                    <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span>{log.ip_address || 'Internal'}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    log.status === 'SUCCESS'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                                                        : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                                                }`}>
                                                    {log.status === 'SUCCESS'
                                                        ? <CheckCircle2 className="w-3 h-3" />
                                                        : <AlertTriangle className="w-3 h-3" />
                                                    }
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Pagination Footer ── */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                                Total events logged:{' '}
                                <span className="font-bold text-[#1C3A5A] dark:text-sky-400">{totalCount}</span>
                            </span>

                            <div className="flex items-center gap-4">
                                {/* Rows per page */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-slate-400">Rows:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#1C3A5A] dark:text-slate-300"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>

                                {/* Page navigation */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium px-1">
                                        Page <span className="font-bold text-gray-800 dark:text-slate-200">{currentPage}</span>{' '}
                                        of <span className="font-bold text-gray-800 dark:text-slate-200">{totalPages}</span>
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuditLogsTable;
