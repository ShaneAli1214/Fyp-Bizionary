import PageHeader from '../../components/ui/PageHeader';
import Skeleton from '../../components/ui/Skeleton';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, CheckCircle2, Clock3, Download, Package, Filter, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../../services/api';
import { formatPKR } from '../../utils/currency';
import { normalizeProductCategory, CATEGORY_COMPANIES } from '../../utils/productCategories';
import OrderSlipForm from './OrderSlipForm';

const OrderedSlips = () => {
    const navigate = useNavigate();
    const [orderedSlips, setOrderedSlips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [partialQuantities, setPartialQuantities] = useState({});
    const [busySlipId, setBusySlipId] = useState(null);
    const [purchases, setPurchases] = useState([]);
    const [purchasesLoading, setPurchasesLoading] = useState(true);
    const [purchaseError, setPurchaseError] = useState('');

    const emitInventoryRefresh = (action) => {
        window.dispatchEvent(new CustomEvent('inventoryRefreshRequested', {
            detail: {
                source: 'ordered-slips',
                action,
                timestamp: Date.now(),
            },
        }));
    };

    const fetchOrderedSlips = async () => {
        try {
            setLoading(true);
            const res = await api.get('purchases/ordered-slips/');
            const slipsPayload = res.data?.results || res.data?.data || res.data || [];
            setOrderedSlips(slipsPayload);
        } catch (error) {
            setOrderedSlips([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderedSlips();
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            setPurchasesLoading(true);
            setPurchaseError('');
            const res = await api.get('purchases/');
            const purchasesPayload = res.data?.data || res.data || [];
            setPurchases(Array.isArray(purchasesPayload) ? purchasesPayload : []);
        } catch (error) {
            setPurchaseError('Failed to load purchase history.');
            setPurchases([]);
        } finally {
            setPurchasesLoading(false);
        }
    };

    const formatApiError = (error, fallbackMessage) => {
        const payload = error?.response?.data;
        if (!payload) {
            return fallbackMessage;
        }

        if (typeof payload === 'string') {
            return payload;
        }

        if (Array.isArray(payload)) {
            return payload.join(', ');
        }

        if (payload.detail) {
            return payload.detail;
        }

        const firstField = Object.keys(payload)[0];
        if (firstField && Array.isArray(payload[firstField])) {
            return `${firstField}: ${payload[firstField].join(', ')}`;
        }

        return fallbackMessage;
    };

    const handleCreateSlip = async (slipData) => {
        setSubmitting(true);
        setFormError('');
        setFormSuccess('');

        try {
            await api.post('purchases/ordered-slips/', slipData);
            setFormSuccess('Order slip generated successfully.');
            setIsFormOpen(false);
            await fetchOrderedSlips();
            window.dispatchEvent(new CustomEvent('orderedSlipUpdated', { detail: { action: 'created', timestamp: Date.now() } }));
            emitInventoryRefresh('created');
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to generate order slip.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handlePartialReceipt = async (id) => {
        try {
            const quantityReceived = Number(partialQuantities[id] || 0);
            if (!quantityReceived) {
                setFormError('Enter received quantity before marking partial receipt.');
                return;
            }

            setBusySlipId(id);
            setFormError('');
            await api.post(`purchases/ordered-slips/${id}/mark-partial/`, { quantity_received: quantityReceived });
            await fetchOrderedSlips();
            setFormSuccess('Partial receipt saved and stock updated.');
            window.dispatchEvent(new CustomEvent('orderedSlipUpdated', { detail: { action: 'partial-received', slipId: id, timestamp: Date.now() } }));
            emitInventoryRefresh('partial-received');
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to mark partial receipt.'));
        } finally {
            setBusySlipId(null);
        }
    };

    const handleCompleteReceipt = async (id) => {
        try {
            setBusySlipId(id);
            setFormError('');
            await api.post(`purchases/ordered-slips/${id}/mark-complete/`);
            await fetchOrderedSlips();
            setFormSuccess('Slip marked complete and received stamp generated.');
            window.dispatchEvent(new CustomEvent('orderedSlipUpdated', { detail: { action: 'completed', slipId: id, timestamp: Date.now() } }));
            emitInventoryRefresh('completed');
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to mark slip complete.'));
        } finally {
            setBusySlipId(null);
        }
    };

    const handleDeleteSlip = async (id) => {
        const confirmed = window.confirm('Delete this ordered slip? This cannot be undone.');
        if (!confirmed) {
            return;
        }

        try {
            setBusySlipId(id);
            setFormError('');
            await api.delete(`purchases/ordered-slips/${id}/`);
            await fetchOrderedSlips();
            setFormSuccess('Ordered slip deleted successfully.');
            window.dispatchEvent(new CustomEvent('orderedSlipUpdated', { detail: { action: 'deleted', slipId: id, timestamp: Date.now() } }));
            emitInventoryRefresh('deleted');
        } catch (error) {
            setFormError(formatApiError(error, 'Failed to delete ordered slip.'));
        } finally {
            setBusySlipId(null);
        }
    };

    const handleDownload = async (slip, received = false) => {
        try {
            setFormError('');
            await downloadSlipPdf(slip, received);
        } catch (err) {
            console.error('PDF generation error', err);
            setFormError(`Failed to generate PDF: ${err?.message || String(err)}`);
        }
    };

    // Using drawn stamp instead of embedding external image

    const downloadSlipPdf = async (slip, received = false) => {
        if (!slip || typeof slip !== 'object') {
            throw new Error('Invalid slip data provided to PDF generator');
        }

        try {
            const pageWidth = 210;
            const pageHeight = 235;
            const doc = new jsPDF({ unit: 'mm', format: [pageWidth, pageHeight] });
            // Use drawn stamp (no external image embedding)
        const marginX = 4;
        const marginY = 6;
        const contentWidth = pageWidth - (marginX * 2);

        const drawBox = (x, y, width, height, fillColor = [255, 255, 255], strokeColor = [210, 210, 210], lineWidth = 0.3) => {
            doc.setFillColor(...fillColor);
            doc.setDrawColor(...strokeColor);
            doc.setLineWidth(lineWidth);
            doc.rect(x, y, width, height, 'FD');
        };

        const writeValue = (x, y, text, width, align = 'left', fontSize = 8.5, bold = false, color = [35, 35, 35]) => {
            doc.setTextColor(...color);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setFontSize(fontSize);
            const lines = doc.splitTextToSize(String(text ?? ''), width);
            doc.text(lines, x, y, { align, baseline: 'top' });
            return Array.isArray(lines) ? lines.length : 1;
        };

        const drawReceiptStamp = (centerX, centerY, radius) => {
            const blue = [31, 78, 121];
            const innerBlue = [41, 98, 175];

            doc.setDrawColor(...blue);
            doc.setLineWidth(1.2);
            doc.circle(centerX, centerY, radius, 'S');
            doc.setLineWidth(0.8);
            doc.circle(centerX, centerY, radius - 3.5, 'S');

            // No circular brand text — only rings and center labels
            doc.setTextColor(...blue);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);

            doc.setTextColor(...innerBlue);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('RECEIVED', centerX, centerY - 1, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text('DATE', centerX, centerY + 8.5, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text(received ? (slip.received_at || slip.created_at || '') : (slip.created_at || ''), centerX, centerY + 13, { align: 'center' });
        };

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.4);
        doc.rect(marginX, marginY, contentWidth, pageHeight - (marginY * 2), 'S');

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('RECEIPT PURCHASE ORDER', pageWidth / 2, 16, { align: 'center' });
        doc.setDrawColor(229, 174, 177);
        doc.setLineWidth(0.5);
        doc.line(marginX + 2, 20, pageWidth - marginX - 2, 20);

        const leftColX = marginX + 2;
        const rightColX = 104;
        const labelWidth = 28;
        const valueWidth = 36;
        const rowHeight = 9;

        const topRowY = 26;
        const topLeftWidth = 98;
        const topRightWidth = 98;
        const topBlockHeight = 27;

        drawBox(leftColX, topRowY, topLeftWidth, topBlockHeight, [252, 236, 237], [200, 200, 200]);
        drawBox(rightColX, topRowY, topRightWidth, topBlockHeight, [252, 236, 237], [200, 200, 200]);

        const normalizedCat = normalizeProductCategory(slip.category || slip.product_category || '');
        const vendorList = CATEGORY_COMPANIES[normalizedCat] || [];
        const vendorInfo = vendorList.find((c) => c.name === slip.company_name) || vendorList[0] || { name: slip.company_name || '', email: slip.company_email || '', contact: '', phone: '', address: '' };

        drawBox(leftColX, topRowY + 0.5, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(leftColX + 1.5, topRowY + 2, 'Vendor Name:', 24, 'left', 8, true);
        writeValue(leftColX + labelWidth + 1.5, topRowY + 2, vendorInfo.name || slip.company_name || '', topLeftWidth - labelWidth - 4, 'left', 8.5, false);

        // Removed Vendor Address row per request
        drawBox(rightColX, topRowY + 0.5, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(rightColX + 1.5, topRowY + 2, 'Date:', 24, 'left', 8, true);
        const createdAt = slip.created_at ? new Date(slip.created_at).toLocaleString() : '';
        writeValue(rightColX + labelWidth + 1.5, topRowY + 2, createdAt, topRightWidth - labelWidth - 4, 'left', 8.5, false);

        const thirdLeftY = topRowY + rowHeight;
        drawBox(leftColX, thirdLeftY, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(leftColX + 1.5, thirdLeftY + 2, 'Contact:', 24, 'left', 8, true);
        writeValue(leftColX + labelWidth + 1.5, thirdLeftY + 2, vendorInfo.contact || vendorInfo.email || 'N/A', topLeftWidth - labelWidth - 4, 'left', 8.5, false);

        drawBox(rightColX, thirdLeftY, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(rightColX + 1.5, thirdLeftY + 2, 'Due Date:', 24, 'left', 8, true);
        const dueDate = slip.due_date ? new Date(slip.due_date).toLocaleString() : (slip.created_at ? new Date(new Date(slip.created_at).getTime() + (2 * 24 * 60 * 60 * 1000)).toLocaleString() : '');
        writeValue(rightColX + labelWidth + 1.5, thirdLeftY + 2, dueDate || '', topRightWidth - labelWidth - 4, 'left', 8.5, false);

        const fourthLeftY = topRowY + (rowHeight * 2);
        drawBox(leftColX, fourthLeftY, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(leftColX + 1.5, fourthLeftY + 2, 'Email:', 24, 'left', 8, true);
        writeValue(leftColX + labelWidth + 1.5, fourthLeftY + 2, vendorInfo.email || slip.company_email || 'N/A', topLeftWidth - labelWidth - 4, 'left', 8.5, false);

        drawBox(rightColX, fourthLeftY, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(rightColX + 1.5, fourthLeftY + 2, 'PO Number:', 24, 'left', 8, true);
        writeValue(rightColX + labelWidth + 1.5, fourthLeftY + 2, `PO-${String(slip.id).padStart(5, '0')}`, topRightWidth - labelWidth - 4, 'left', 8.5, false);

        const middleRowY = 58;
        drawBox(leftColX, middleRowY, topLeftWidth, 19, [252, 236, 237], [200, 200, 200]);
        drawBox(rightColX, middleRowY, topRightWidth, 19, [252, 236, 237], [200, 200, 200]);

        const shipToName = slip.delivery_location === 'SHOP' ? 'Bizionary Shop' : 'Bizionary Warehouse';
        const shipToAddr = slip.delivery_location === 'SHOP' ? 'Direct to Shop' : 'Main warehouse';

        drawBox(leftColX, middleRowY, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(leftColX + 1.5, middleRowY + 2, 'Ship To:', 24, 'left', 8, true);
        writeValue(leftColX + labelWidth + 1.5, middleRowY + 2, shipToName, topLeftWidth - labelWidth - 4, 'left', 8.5, false);

        drawBox(leftColX, middleRowY + rowHeight, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(leftColX + 1.5, middleRowY + rowHeight + 2, 'Ship To Address:', 24, 'left', 8, true);
        writeValue(leftColX + labelWidth + 1.5, middleRowY + rowHeight + 2, shipToAddr, topLeftWidth - labelWidth - 4, 'left', 8.5, false);

        drawBox(rightColX, middleRowY, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(rightColX + 1.5, middleRowY + 2, 'Ship Via:', 24, 'left', 8, true);
        writeValue(rightColX + labelWidth + 1.5, middleRowY + 2, 'Supplier delivery', topRightWidth - labelWidth - 4, 'left', 8.5, false);

        drawBox(rightColX, middleRowY + rowHeight, labelWidth, rowHeight, [249, 217, 218], [230, 230, 230]);
        writeValue(rightColX + 1.5, middleRowY + rowHeight + 2, 'Tracking Number:', 24, 'left', 8, true);
        writeValue(rightColX + labelWidth + 1.5, middleRowY + rowHeight + 2, `TRK-${String(slip.id).padStart(7, '0')}`, topRightWidth - labelWidth - 4, 'left', 8.5, false);

        const tableY = 78;
        const tableX = leftColX;
        const tableWidth = contentWidth - 4;
        const productColW = 68;
        const qtyColW = 24;
        const unitColW = 46;
        const totalColW = tableWidth - productColW - qtyColW - unitColW;
        const qtyCenter = tableX + productColW + (qtyColW / 2);
        const unitCenter = tableX + productColW + qtyColW + (unitColW / 2);
        const totalCenter = tableX + productColW + qtyColW + unitColW + (totalColW / 2);
        const headerH = 9;
        const lineH = 7.5;

        drawBox(tableX, tableY, tableWidth, 7.5, [248, 236, 237], [190, 190, 190]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(25, 25, 25);
        doc.text('Product Description', tableX + 3, tableY + 5.2);
        doc.text('Quantity', tableX + productColW + 4, tableY + 5.2);
        doc.text('Unit Price', tableX + productColW + qtyColW + 4, tableY + 5.2);
        doc.text('Total [1]', tableX + productColW + qtyColW + unitColW + 4, tableY + 5.2);

        const tableRows = [
            [slip.product_name || '', String(slip.quantity_ordered || 0), formatPKR(slip.unit_cost), formatPKR(slip.total_cost)],
            [slip.product_code ? `Code: ${slip.product_code}` : '', slip.quantity_received ? `Received: ${slip.quantity_received}` : '', '', ''],
        ];

        let currentY = tableY + 7.5;
        const blankRows = 2;
        const rowCount = Math.max(tableRows.length, 1) + blankRows;
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
            const isDataRow = rowIndex < tableRows.length;
            drawBox(tableX, currentY, tableWidth, lineH, [255, 255, 255], [238, 188, 191], 0.2);
            doc.setDrawColor(238, 188, 191);
            doc.setLineWidth(0.2);
            doc.line(tableX + productColW, currentY, tableX + productColW, currentY + lineH);
            doc.line(tableX + productColW + qtyColW, currentY, tableX + productColW + qtyColW, currentY + lineH);
            doc.line(tableX + productColW + qtyColW + unitColW, currentY, tableX + productColW + qtyColW + unitColW, currentY + lineH);

            if (isDataRow) {
                const [description, quantity, unitPrice, totalPrice] = tableRows[rowIndex];
                writeValue(tableX + 2, currentY + 1.5, description, productColW - 4, 'left', 8, false);
                writeValue(qtyCenter, currentY + 1.5, quantity, qtyColW - 4, 'center', 8, false);
                writeValue(unitCenter, currentY + 1.5, unitPrice, unitColW - 4, 'center', 8, false);
                writeValue(totalCenter, currentY + 1.5, totalPrice, totalColW - 4, 'center', 8, false);
            }

            currentY += lineH;
        }

        const bottomY = currentY + 1.5;
        const notesW = 92;
        const totalsW = 104;
        const notesH = 24;
        const totalsH = 24;

        // compute totals width relative to the actual table width so it can sit flush
        const totalsWAdjusted = Math.min(totalsW - 6, tableWidth - notesW - 4);
        // position summaryX so the totals box right edge aligns with the product table's right edge
        const summaryX = tableX + tableWidth - totalsWAdjusted;

        // draw notes box and totals outer box using summaryX so borders align with product table
        drawBox(tableX, bottomY, notesW, notesH, [255, 255, 255], [190, 190, 190]);
        drawBox(summaryX, bottomY, totalsWAdjusted, totalsH, [255, 255, 255], [190, 190, 190]);

        drawBox(tableX, bottomY, notesW, 6, [248, 236, 237], [190, 190, 190]);
        writeValue(tableX + 2, bottomY + 1.4, 'ADDITIONAL NOTES', notesW - 4, 'left', 7.5, true);
        writeValue(tableX + 2, bottomY + 7.5, '1. Please deliver to the designated address by the due date.', notesW - 4, 'left', 6.7, false);
        writeValue(tableX + 2, bottomY + 11.5, '2. If you have any questions, contact the vendor directly.', notesW - 4, 'left', 6.7, false);

        // helper: draw a two-column totals row (label | amount) inside the summary box
        const drawTotalsRow = (rowY, height, labelText, amountText, opts = {}) => {
            const { bg = [248, 236, 237], labelBold = true, amountBold = false } = opts;
            drawBox(summaryX, rowY, totalsWAdjusted, height, [255, 255, 255], [190, 190, 190]);
            // background header rows
            drawBox(summaryX, rowY, totalsWAdjusted, height, bg, [190, 190, 190]);
            const paddingX = 6;
            const labelW = Math.floor(totalsWAdjusted * 0.55) - paddingX; // left column
            const amountW = totalsWAdjusted - labelW - (paddingX * 2);
            // label (left)
            writeValue(summaryX + paddingX, rowY + 1.4, labelText, labelW, 'left', 7.5, labelBold);
            // amount (right) — align flush to right edge of summary box
            writeValue(summaryX + totalsWAdjusted - paddingX, rowY + 1.4, amountText, amountW, 'right', 7.5, amountBold);
        };

        // draw rows
        drawTotalsRow(bottomY, 6, 'Subtotal:', formatPKR(slip.total_cost), { bg: [248, 236, 237], labelBold: true, amountBold: false });
        drawTotalsRow(bottomY + 6, 6, 'Shipping & Handling:', 'Rs 0.00', { bg: [248, 236, 237], labelBold: true, amountBold: false });
        drawTotalsRow(bottomY + 12, 6, 'TAX: 5 %', 'Rs 0.00', { bg: [248, 236, 237], labelBold: true, amountBold: false });
        drawTotalsRow(bottomY + 18, 6, 'TOTAL AMOUNT:', formatPKR(slip.total_cost), { bg: [243, 209, 211], labelBold: true, amountBold: true });

        if (received) {
            // revert stamp position back to original placement
            const stampCenterY = pageHeight - 45;
            drawReceiptStamp(pageWidth / 2, stampCenterY, 30);
        }

            doc.setTextColor(120, 120, 120);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text(received ? 'Received stamp generated after completion.' : 'Generated order slip before receipt.', marginX + 2, pageHeight - 8);
            doc.save(`${received ? 'received' : 'ordered'}-slip-OS-${String(slip.id).padStart(4, '0')}.pdf`);
        } catch (err) {
            console.error('downloadSlipPdf error:', err);
            throw new Error(`PDF generation failed: ${err?.message || err}`);
        }
    };

    const filteredSlips = useMemo(() => {
        return orderedSlips.filter((slip) => {
            const matchesSearch = [slip.product_name, slip.company_name, slip.id]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'ALL' || slip.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orderedSlips, searchTerm, statusFilter]);

    const statusBadgeClass = (status) => {
        if (status === 'COMPLETED') return 'bg-status-success/10 text-status-success border-emerald-100';
        if (status === 'PARTIAL_RECEIVED') return 'bg-amber-50 text-status-info border-amber-100';
        return 'bg-page text-primary border-card';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <PageHeader
                    title="Ordered Slips"
                    subtitle="Generated supplier slips, partial receipts, and received stamps live here."
                />

                <button
                    onClick={() => setIsFormOpen(true)}
                    className="inline-flex items-center justify-center px-5 py-2 bg-primary text-card rounded-full text-sm font-bold transition-all hover:opacity-85 active:scale-[0.98] shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Slip
                </button>
            </div>

            {formSuccess && (
                <div className="px-4 py-3 rounded-xl border border-emerald-100 bg-status-success/10 text-status-success text-sm font-medium">{formSuccess}</div>
            )}
            {formError && (
                <div className="px-4 py-3 rounded-xl border border-rose-100 bg-status-info/10 text-status-info text-sm font-medium">{formError}</div>
            )}

            <div className="bg-surface rounded-2xl border border-card shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                    <div className="relative flex-1 max-w-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-secondary" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-card rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-card shadow-sm text-textMain placeholder-textMuted"
                            placeholder="Search by company, product, or slip number..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="pl-9 pr-3 py-2 border border-card rounded-xl text-sm bg-card text-textMain outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="PARTIAL_RECEIVED">Partial Received</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>

                        <button
                            onClick={() => navigate('/inventory-managment')}
                            className="inline-flex items-center justify-center px-5 py-2 bg-card text-primary rounded-full text-sm font-bold transition-all hover:bg-active-pill/30 border border-card shadow-sm"
                        >
                            <Package className="h-4 w-4 mr-2" />
                            Inventory
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-surface rounded-2xl border border-card shadow-sm p-6">
                    <Skeleton.TableRows count={6} cols={5} />
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSlips.length === 0 ? (
                        <div className="bg-surface rounded-2xl border border-card shadow-sm px-6 py-12 text-center text-textMuted">
                            <Clock3 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <p>No ordered slips found.</p>
                        </div>
                    ) : filteredSlips.map((slip) => {
                        const receivedPercent = slip.quantity_ordered ? Math.round((Number(slip.quantity_received || 0) / Number(slip.quantity_ordered || 1)) * 100) : 0;

                        return (
                            <div key={slip.id} className="bg-card rounded-2xl border border-card shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-bold text-textMain">OS-{String(slip.id).padStart(4, '0')}</h3>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadgeClass(slip.status)}`}>{slip.status.replaceAll('_', ' ')}</span>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                                slip.delivery_location === 'SHOP' 
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                                {slip.delivery_location === 'SHOP' ? 'Direct to Shop' : 'Warehouse'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-textMuted mt-1">{slip.company_name}</p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => handleDeleteSlip(slip.id)}
                                            disabled={busySlipId === slip.id}
                                            className="inline-flex items-center px-3 py-2 rounded-xl border border-card bg-status-info/10 text-sm font-semibold text-status-info hover:bg-status-info/20 disabled:opacity-60"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => handleDownload(slip, false)}
                                            className="inline-flex items-center px-3 py-2 rounded-xl border border-card bg-card text-sm font-semibold text-textMain hover:bg-page"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download PDF
                                        </button>
                                        {slip.status !== 'COMPLETED' && (
                                            <button
                                                onClick={() => handleCompleteReceipt(slip.id)}
                                                disabled={busySlipId === slip.id}
                                                className="inline-flex items-center px-3 py-2 rounded-xl bg-status-success text-sm font-semibold text-card hover:bg-emerald-700 disabled:opacity-60"
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Mark Complete
                                            </button>
                                        )}
                                        {slip.status === 'COMPLETED' && (
                                            <button
                                                onClick={() => handleDownload(slip, true)}
                                                className="inline-flex items-center px-3 py-2 rounded-xl border border-card bg-status-success/10 text-sm font-semibold text-status-success hover:bg-status-success/20"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Received PDF
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 grid gap-4 lg:grid-cols-4 md:grid-cols-2">
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-textMuted font-semibold">Product</div>
                                        <div className="mt-1 text-sm font-bold text-textMain">{slip.product_name}</div>
                                        <div className="text-[11px] text-textMuted font-mono">{slip.product_code}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-textMuted font-semibold">Category</div>
                                        <div className="mt-1 text-sm font-bold text-textMain">{normalizeProductCategory(slip.product_category) || slip.product_category || 'N/A'}</div>
                                        <div className="text-[11px] text-textMuted">Current price: {formatPKR(slip.current_unit_price)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-textMuted font-semibold">Quantities</div>
                                        <div className="mt-1 text-sm font-bold text-textMain">{slip.quantity_received} / {slip.quantity_ordered}</div>
                                        <div className="text-[11px] text-textMuted">Received {receivedPercent}%</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-textMuted font-semibold">Total Amount</div>
                                        <div className="mt-1 text-sm font-bold text-status-success">{formatPKR(slip.total_cost)}</div>
                                        <div className="text-[11px] text-textMuted">Unit cost: {formatPKR(slip.unit_cost)}</div>
                                    </div>
                                </div>

                                <div className="px-6 pb-6 grid gap-4 lg:grid-cols-[1fr_auto] items-end border-t border-gray-50 pt-4">
                                    <div>
                                        <div className="text-xs uppercase tracking-wider text-textMuted font-semibold mb-2">Received So Far</div>
                                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                            <input
                                                type="number"
                                                min="1"
                                                max={slip.quantity_ordered}
                                                value={partialQuantities[slip.id] || ''}
                                                onChange={(event) => setPartialQuantities((prev) => ({ ...prev, [slip.id]: event.target.value }))}
                                                className="w-full sm:w-40 px-3 py-2 border border-card rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                                                placeholder="Total received"
                                            />
                                            <button
                                                onClick={() => handlePartialReceipt(slip.id)}
                                                disabled={busySlipId === slip.id}
                                                className="inline-flex items-center px-4 py-2 rounded-xl bg-status-info text-sm font-semibold text-card hover:bg-amber-600 disabled:opacity-60"
                                            >
                                                <Clock3 className="h-4 w-4 mr-2" />
                                                Mark Partial Received
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs uppercase tracking-wider text-textMuted font-semibold mb-1">Inventory</div>
                                        <div className={`text-sm font-bold ${slip.status === 'COMPLETED' ? 'text-status-success' : 'text-textMain'}`}>
                                            {slip.status === 'COMPLETED' ? 'Stock updated' : 'Waiting for receipt'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="bg-card rounded-2xl border border-card shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-textMain">Supplier Purchase History</h2>
                        <p className="text-sm text-textMuted">Showing completed procurement purchases and payment statuses.</p>
                    </div>
                </div>

                {purchasesLoading ? (
                    <div className="p-6">
                        <Skeleton.TableRows count={4} cols={5} />
                    </div>
                ) : purchaseError ? (
                    <div className="text-center text-sm text-status-info py-8">{purchaseError}</div>
                ) : purchases.length === 0 ? (
                    <div className="text-center text-sm text-textMuted py-8">No purchase history found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-card">
                                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Purchase #</th>
                                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Supplier</th>
                                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Quantity</th>
                                    <th className="px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-card">
                                {purchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-page/50">
                                        <td className="px-4 py-3 text-sm font-semibold text-primary">PO-{String(purchase.id).padStart(5, '0')}</td>
                                        <td className="px-4 py-3 text-sm text-textMain">{purchase.company_name}</td>
                                        <td className="px-4 py-3 text-sm text-textMain">{purchase.product_name}</td>
                                        <td className="px-4 py-3 text-sm text-secondary">{purchase.purchase_date}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`text-xs font-bold ${
                                                purchase.payment_status === 'PAID' ? 'text-status-success' :
                                                purchase.payment_status === 'PARTIAL' ? 'text-status-info' :
                                                'text-text-secondary'
                                            }`}>
                                                {purchase.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-primary">{purchase.quantity_purchased}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-right text-primary">{formatPKR(purchase.total_cost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <OrderSlipForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateSlip}
                submitting={submitting}
                errorMessage={formError}
            />
        </div>
    );
};

export default OrderedSlips;