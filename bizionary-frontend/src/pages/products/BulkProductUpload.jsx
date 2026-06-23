import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, AlertCircle, CheckCircle2, ArrowLeft, FileText, X, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';


const BulkProductUpload = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { user } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        if (user) {
            const isAdminOrManager = user.role_level === 'ADMIN' || 
                user.role_level === 'MANAGER' || 
                user.role_name?.toLowerCase().includes('admin') || 
                user.role_name?.toLowerCase().includes('manager');
            
            const isAccountant = user.role_name === 'Accountant';
            
            if (!isAdminOrManager || isAccountant) {
                addToast('error', 'You do not have permission to perform bulk uploads');
                navigate('/products', { replace: true });
            }
        }
    }, [user, navigate, addToast]);

    // State management
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [headers, setHeaders] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('added'); // 'added' | 'duplicates' | 'errors'

    // CSV parsing client side (naively splits first 5 rows for verification)
    const handleFileChange = (selectedFile) => {
        if (!selectedFile) return;
        if (!selectedFile.name.endsWith('.csv')) {
            setError('Please select a valid CSV file (.csv).');
            setFile(null);
            setPreviewData([]);
            return;
        }

        setFile(selectedFile);
        setError(null);
        setResult(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length > 0) {
                    const csvHeaders = lines[0].split(',').map(h => h.trim());
                    const previewRows = lines.slice(1, 6).map(line => {
                        // Regex to correctly split by commas ignoring commas within quotes
                        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
                        const rowObj = {};
                        csvHeaders.forEach((h, index) => {
                            rowObj[h] = values[index] || '';
                        });
                        return rowObj;
                    });
                    setHeaders(csvHeaders);
                    setPreviewData(previewRows);
                } else {
                    setError('The selected file is empty.');
                    setFile(null);
                }
            } catch (err) {
                setError('Failed to parse file preview.');
                setFile(null);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFileChange(droppedFile);
    };

    const clearFile = () => {
        setFile(null);
        setHeaders([]);
        setPreviewData([]);
        setError(null);
    };

    const handleUploadSubmit = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('products/bulk-upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            setIsReportModalOpen(true);
            
            // Set initial active tab based on which records exist
            const resData = res.data;
            if ((resData.insertedCount ?? resData.inserted?.length ?? 0) > 0) {
                setModalTab('added');
            } else if ((resData.duplicatesCount ?? resData.duplicates?.length ?? 0) > 0) {
                setModalTab('duplicates');
            } else {
                setModalTab('errors');
            }
            
            clearFile(); // clear the input file after upload response
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Product upload failed.');
        } finally {
            setUploading(false);
        }
    };

    // Export error and duplicate rows as a new CSV for correction
    const handleExportErrorReport = () => {
        if (!result) return;
        
        // CSV headers matching the original bulk products format
        const csvHeaders = [
            "product_name", "sku", "category", "purchase_price", "selling_price", 
            "quantity", "supplier_company", "supplier_contact", "unit", "description", 
            "reorder_level", "upload_status", "failure_reason"
        ];
        
        const csvRows = [];

        // Add errors
        const errorsList = result.errors ?? result.errorRows ?? [];
        errorsList.forEach(err => {
            csvRows.push([
                "", // product_name (unknown or missing)
                "", // sku
                "", // category
                "", // purchase_price
                "", // selling_price
                "", // quantity
                "", // supplier_company
                "", // supplier_contact
                "", // unit
                "", // description
                "", // reorder_level
                "ERROR",
                err.reason
            ]);
        });
        
        // Add duplicates
        const duplicatesList = result.duplicates ?? result.duplicateRows ?? [];
        duplicatesList.forEach(dup => {
            csvRows.push([
                dup.product_name || "",
                dup.sku || "",
                dup.existing_product?.category || "",
                dup.existing_product?.cost_price || "",
                dup.existing_product?.unit_price || "",
                dup.existing_product?.stock_quantity || "",
                "", // supplier_company
                "", // supplier_contact
                "", // unit
                "", // description
                "", // reorder_level
                "DUPLICATE",
                dup.reason || "Product with this SKU already exists in database"
            ]);
        });
        
        // Format to string
        const csvContent = [
            csvHeaders.join(","),
            ...csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
        ].join("\n");
        
        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bulk_products_error_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to parse column names from error reasons
    const getErrorColumn = (reason) => {
        const lower = String(reason).toLowerCase();
        if (lower.includes('product_name') || lower.includes('name')) return 'product_name';
        if (lower.includes('sku')) return 'sku';
        if (lower.includes('purchase_price') || lower.includes('cost_price')) return 'purchase_price';
        if (lower.includes('selling_price') || lower.includes('unit_price')) return 'selling_price';
        if (lower.includes('quantity') || lower.includes('stock')) return 'quantity';
        if (lower.includes('reorder_level') || lower.includes('min_stock')) return 'reorder_level';
        if (lower.includes('supplier_contact')) return 'supplier_contact';
        if (lower.includes('unit')) return 'unit';
        return 'general';
    };

    return (
        <div className="space-y-6">
            {/* Header section with back button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/products')}
                    className="p-2 bg-surface hover:bg-background border border-card rounded-xl text-secondary hover:text-textMain transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Back to Products"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <PageHeader title="Bulk Product Upload" subtitle="Add multiple products to your inventory catalog in a single upload." />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Controls Card */}
                <div className="lg:col-span-1 bg-surface p-6 rounded-2xl border border-card shadow-sm space-y-6 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-card pb-4">
                            <h3 className="font-bold text-textMain text-sm uppercase tracking-wider">Select CSV File</h3>
                            <a
                                href="/products_template.csv"
                                download="products_template.csv"
                                className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download Template
                            </a>
                        </div>

                        {/* Drag and Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                dragging
                                    ? 'border-primary bg-primary/5 scale-[1.02]'
                                    : file
                                    ? 'border-emerald-400 bg-status-success/5'
                                    : 'border-card hover:border-primary/50 hover:bg-page'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={(e) => handleFileChange(e.target.files[0])}
                            />
                            {file ? (
                                <div className="space-y-3">
                                    <FileText className="w-10 h-10 text-emerald-500 mx-auto" />
                                    <div>
                                        <p className="font-bold text-textMain text-sm truncate max-w-[200px] mx-auto">{file.name}</p>
                                        <p className="text-xs text-textMuted mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearFile();
                                        }}
                                        className="mx-auto px-3 py-1 bg-page hover:bg-card-hover border border-card rounded-lg text-xs font-bold text-secondary hover:text-danger flex items-center gap-1 transition-all"
                                    >
                                        <X className="w-3 h-3" /> Remove File
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="w-10 h-10 text-textMuted mx-auto transition-transform group-hover:-translate-y-1" />
                                    <p className="font-bold text-textMain text-sm">Drag and drop file here</p>
                                    <p className="text-xs text-textMuted">or click to browse (.csv only)</p>
                                </div>
                            )}
                        </div>

                        {/* Error Message banner */}
                        {error && (
                            <div className="flex items-start gap-2.5 p-4 bg-status-info/10 border border-rose-100 rounded-xl text-status-info">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div className="text-xs font-semibold leading-relaxed">{error}</div>
                            </div>
                        )}
                    </div>

                    {file && (
                        <button
                            onClick={handleUploadSubmit}
                            disabled={uploading}
                            className="w-full py-2.5 bg-primary text-card rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:opacity-90 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {uploading ? (
                                <div className="w-4 h-4 border-2 border-card/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            {uploading ? 'Processing File...' : 'Upload Products'}
                        </button>
                    )}
                </div>

                {/* Preview and Results Placeholder Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Last Upload Quick Trigger */}
                    {result && (
                        <div className="bg-surface p-6 rounded-2xl border border-card shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-card pb-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <h3 className="font-bold text-textMain text-sm uppercase tracking-wider">Last Upload Staging</h3>
                                </div>
                                <button
                                    onClick={() => setIsReportModalOpen(true)}
                                    className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Open Detailed Report
                                </button>
                            </div>
                            <p className="text-xs text-textMuted">
                                Bulk upload completed: <strong>{result.insertedCount ?? result.inserted?.length ?? 0} added</strong>, &nbsp;
                                <strong>{result.duplicatesCount ?? result.duplicates?.length ?? 0} duplicates skipped</strong>, &nbsp;
                                <strong>{result.errorsCount ?? result.errors?.length ?? 0} rows failed</strong>.
                            </p>
                        </div>
                    )}

                    {/* Preview Table */}
                    {file && previewData.length > 0 && (
                        <div className="bg-surface rounded-2xl border border-card shadow-sm overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-card bg-page/30">
                                <h3 className="font-bold text-textMain text-sm uppercase tracking-wider">CSV Data Preview (First 5 Rows)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="text-text-secondary uppercase tracking-wider border-b border-card bg-page/20">
                                        <tr>
                                            {headers.map((h, i) => (
                                                <th key={i} className="px-4 py-3 font-bold">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-card">
                                        {previewData.map((row, index) => (
                                            <tr key={index} className="hover:bg-page transition-colors">
                                                {headers.map((h, i) => (
                                                    <td key={i} className="px-4 py-3 text-textMain font-medium truncate max-w-[150px]">{row[h]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Empty placeholder view */}
                    {!file && !result && (
                        <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-card shadow-sm text-center">
                            <FileText className="w-12 h-12 text-card mb-3" />
                            <h3 className="font-bold text-textMain text-sm">No File Selected</h3>
                            <p className="text-xs text-textMuted mt-1 max-w-sm">Select or drop a CSV file to review details and preview rows prior to upload execution.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── DETAILED RESULTS REPORT MODAL ─────────────────────────── */}
            {isReportModalOpen && result && (
                <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-card">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl"><FileText className="w-5 h-5 text-primary" /></div>
                                <div>
                                    <h2 className="text-base font-bold text-textMain">
                                        Upload Complete — {result.insertedCount ?? result.inserted?.length ?? 0} of {result.total ?? 0} products added
                                    </h2>
                                    <p className="text-xs text-textMuted">Staged database bulk operations result logs</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsReportModalOpen(false)}
                                className="p-2 hover:bg-page rounded-xl transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4 text-secondary" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                            {/* Color-Coded Progress Summary Bar */}
                            <div className="space-y-2">
                                <div className="flex rounded-full overflow-hidden h-3.5 w-full bg-page border border-card shadow-inner">
                                    <div
                                        className="bg-status-success transition-all duration-500"
                                        style={{ width: `${((result.insertedCount ?? result.inserted?.length ?? 0) / (result.total || 1)) * 100}%` }}
                                        title={`${result.insertedCount ?? result.inserted?.length ?? 0} Added`}
                                    ></div>
                                    <div
                                        className="bg-status-info transition-all duration-500"
                                        style={{ width: `${((result.duplicatesCount ?? result.duplicates?.length ?? 0) / (result.total || 1)) * 100}%` }}
                                        title={`${result.duplicatesCount ?? result.duplicates?.length ?? 0} Duplicates`}
                                    ></div>
                                    <div
                                        className="bg-rose-500 transition-all duration-500"
                                        style={{ width: `${((result.errorsCount ?? result.errors?.length ?? 0) / (result.total || 1)) * 100}%` }}
                                        title={`${result.errorsCount ?? result.errors?.length ?? 0} Errors`}
                                    ></div>
                                </div>

                                <div className="flex items-center gap-6 justify-center text-xs font-bold">
                                    <div className="flex items-center gap-1.5 text-status-success">
                                        <span className="w-2.5 h-2.5 rounded-full bg-status-success"></span>
                                        <span>Added: {result.insertedCount ?? result.inserted?.length ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-status-info">
                                        <span className="w-2.5 h-2.5 rounded-full bg-status-info"></span>
                                        <span>Duplicates: {result.duplicatesCount ?? result.duplicates?.length ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-rose-500">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                        <span>Errors: {result.errorsCount ?? result.errors?.length ?? 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Switcher */}
                            <div className="flex gap-1 bg-page p-1 rounded-xl w-fit border border-card">
                                <button
                                    onClick={() => setModalTab('added')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        modalTab === 'added' ? 'bg-card text-primary shadow-sm border border-card' : 'text-textMuted hover:text-textMain'
                                    }`}
                                >
                                    Added ({result.insertedCount ?? result.inserted?.length ?? 0})
                                </button>
                                <button
                                    onClick={() => setModalTab('duplicates')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        modalTab === 'duplicates' ? 'bg-card text-primary shadow-sm border border-card' : 'text-textMuted hover:text-textMain'
                                    }`}
                                >
                                    Duplicates ({result.duplicatesCount ?? result.duplicates?.length ?? 0})
                                </button>
                                <button
                                    onClick={() => setModalTab('errors')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        modalTab === 'errors' ? 'bg-card text-primary shadow-sm border border-card' : 'text-textMuted hover:text-textMain'
                                    }`}
                                >
                                    Errors ({result.errorsCount ?? result.errors?.length ?? 0})
                                </button>
                            </div>

                            {/* Tab Content Display */}
                            <div className="border border-card rounded-2xl overflow-hidden bg-page/10 max-h-[45vh] overflow-y-auto">
                                {modalTab === 'added' && (
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-page border-b border-card text-text-secondary sticky top-0 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-2.5 font-bold">Product Name</th>
                                                <th className="px-4 py-2.5 font-bold">SKU</th>
                                                <th className="px-4 py-2.5 font-bold">Category</th>
                                                <th className="px-4 py-2.5 font-bold text-center">Qty</th>
                                                <th className="px-4 py-2.5 font-bold text-right">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-card">
                                            {(result.inserted ?? result.insertedRows ?? []).length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-8 text-center text-textMuted font-semibold">No products added in this upload batch.</td>
                                                </tr>
                                            ) : (result.inserted ?? result.insertedRows ?? []).map((prod, i) => (
                                                <tr key={i} className="hover:bg-page transition-colors">
                                                    <td className="px-4 py-2.5 font-bold text-textMain">{prod.product_name}</td>
                                                    <td className="px-4 py-2.5 font-mono text-textMuted text-[10px]">{prod.sku}</td>
                                                    <td className="px-4 py-2.5 text-textMuted">{prod.category || 'N/A'}</td>
                                                    <td className="px-4 py-2.5 text-center font-semibold text-text-primary">{prod.quantity}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-status-success">{formatPKR(prod.selling_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {modalTab === 'duplicates' && (
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-page border-b border-card text-text-secondary sticky top-0 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-2.5 font-bold">SKU</th>
                                                <th className="px-4 py-2.5 font-bold">Product Name</th>
                                                <th className="px-4 py-2.5 font-bold">Reason Skipped</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-card">
                                            {(result.duplicates ?? result.duplicateRows ?? []).length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="px-4 py-8 text-center text-textMuted font-semibold">No duplicate SKUs skipped.</td>
                                                </tr>
                                            ) : (result.duplicates ?? result.duplicateRows ?? []).map((dup, i) => (
                                                <tr key={i} className="hover:bg-page transition-colors">
                                                    <td className="px-4 py-2.5 font-mono text-[10px] text-textMuted bg-page/50">{dup.sku}</td>
                                                    <td className="px-4 py-2.5 font-bold text-textMain">{dup.product_name}</td>
                                                    <td className="px-4 py-2.5 text-status-info flex items-center gap-1.5 font-medium">
                                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                        {dup.reason || "Product SKU already exists in catalog"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {modalTab === 'errors' && (
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-page border-b border-card text-text-secondary sticky top-0 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-2.5 font-bold text-center">Row #</th>
                                                <th className="px-4 py-2.5 font-bold">Column</th>
                                                <th className="px-4 py-2.5 font-bold">Error Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-card">
                                            {(result.errors ?? result.errorRows ?? []).length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="px-4 py-8 text-center text-textMuted font-semibold">No failed rows logged.</td>
                                                </tr>
                                            ) : (result.errors ?? result.errorRows ?? []).map((err, i) => (
                                                <tr key={i} className="hover:bg-page transition-colors">
                                                    <td className="px-4 py-2.5 text-center font-bold text-rose-500 bg-rose-50/10">#{err.row}</td>
                                                    <td className="px-4 py-2.5 font-mono text-[10px] text-textMain font-semibold uppercase">{getErrorColumn(err.reason)}</td>
                                                    <td className="px-4 py-2.5 text-rose-700 font-semibold">{err.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-card flex justify-between items-center bg-page/30">
                            {/* Download Error CSV report */}
                            {(result.errorsCount > 0 || result.duplicatesCount > 0 || (result.errors?.length > 0) || (result.duplicates?.length > 0)) ? (
                                <button
                                    onClick={handleExportErrorReport}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export Error Report
                                </button>
                            ) : (
                                <div></div>
                            )}

                            <button
                                onClick={() => {
                                    setIsReportModalOpen(false);
                                    navigate('/products');
                                }}
                                className="px-5 py-2.5 bg-primary text-card rounded-full text-xs font-bold transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
                            >
                                Go to Products
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkProductUpload;
