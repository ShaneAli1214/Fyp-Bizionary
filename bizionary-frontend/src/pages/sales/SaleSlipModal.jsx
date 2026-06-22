import React, { useMemo, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Download, Printer, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatPKR } from '../../utils/currency';

const PAYMENT_METHOD_LABELS = {
    CASH: 'Cash',
    CARD: 'Card',
    EASYPAY_JAZZCASH: 'Easypaisa/Jazz Cash',
    BANK_TRANSFER: 'Bank Transfer',
    OTHER: 'Other',
};

const PAYMENT_STATUS_LABELS = {
    PAID: 'Paid',
    PENDING: 'Pending',
    FAILED: 'Failed',
};

const buildSlipItems = (sale) => {
    if (Array.isArray(sale?.line_items) && sale.line_items.length > 0) {
        return sale.line_items.map((item) => ({
            product_name: item.product_name || item.name || 'Product',
            product_code: item.product_code || item.sku || item.product || 'N/A',
            product_category: item.product_category || sale.product_category || 'N/A',
            quantity_sold: Number(item.quantity_sold || item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            total_price: Number(item.total_price || (Number(item.quantity_sold || item.quantity || 0) * Number(item.unit_price || 0))),
        }));
    }

    return [{
        product_name: sale?.product_name || 'Product',
        product_code: sale?.product_code || sale?.product || 'N/A',
        product_category: sale?.product_category || 'N/A',
        quantity_sold: Number(sale?.quantity_sold || 0),
        unit_price: Number(sale?.unit_price || 0),
        total_price: Number(sale?.total_price || (Number(sale?.quantity_sold || 0) * Number(sale?.unit_price || 0))),
    }];
};

const SaleSlipModal = ({ isOpen, sale, onClose }) => {
    const receiptRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const slipItems = useMemo(() => buildSlipItems(sale), [sale]);
    const saleIdLabel = sale?.id ? `SL-${String(sale.id).padStart(4, '0')}` : 'SL-0000';
    const saleDate = sale?.sale_date
        ? new Date(sale.sale_date).toLocaleDateString()
        : (sale?.created_at ? new Date(sale.created_at).toLocaleDateString() : '');
    const saleTime = sale?.created_at
        ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
    const paymentMethod = PAYMENT_METHOD_LABELS[sale?.payment_method] || sale?.payment_method || 'Cash';
    const paymentStatus = PAYMENT_STATUS_LABELS[sale?.payment_status] || sale?.payment_status || 'Paid';
    const totalPrice = slipItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const discount = Number(sale?.discount || 0);
    const grandTotal = Math.max(totalPrice - discount, 0);
    const totalItems = slipItems.reduce((sum, item) => sum + Number(item.quantity_sold || 0), 0);
    const itemCountLabel = `${slipItems.length} item${slipItems.length === 1 ? '' : 's'}`;

    const handleDownload = async () => {
        if (!receiptRef.current || !sale) {
            return;
        }

        setIsDownloading(true);

        try {
            const contentWidthMm = 80;
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                scrollY: -window.scrollY,
                windowWidth: receiptRef.current.scrollWidth,
                width: receiptRef.current.scrollWidth,
                height: receiptRef.current.scrollHeight,
            });

            const imageData = canvas.toDataURL('image/png');
            const imageHeightMm = (canvas.height * contentWidthMm) / canvas.width;
            const doc = new jsPDF({ unit: 'mm', format: [contentWidthMm, imageHeightMm], orientation: 'portrait' });

            doc.addImage(imageData, 'PNG', 0, 0, contentWidthMm, imageHeightMm);
            doc.save(`Receipt_${saleIdLabel}.pdf`);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <style>{`
                @page {
                    size: 80mm auto;
                    margin: 0;
                }

                @media print {
                    html, body {
                        width: 80mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    .sale-slip-print-area,
                    .sale-slip-print-area * {
                        visibility: visible !important;
                    }

                    .sale-slip-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        max-width: none !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 4mm 3mm !important;
                        font-size: 10px !important;
                    }

                    .sale-slip-no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <button
                type="button"
                className="fixed inset-0 bg-primary/40"
                aria-label="Close sale slip"
                onClick={onClose}
            />

            <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="sale-slip-no-print print:hidden ml-auto rounded-full p-2 text-secondary transition-colors hover:bg-card hover:text-secondary"
                        aria-label="Close sale slip"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div
                        ref={receiptRef}
                        className="sale-slip-print-area mx-auto w-full max-w-[350px] rounded-lg bg-card px-5 py-6 shadow-xl ring-1 ring-gray-200 font-mono text-primary print:w-[80mm] print:max-w-none print:rounded-none print:shadow-none print:ring-0"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="text-center">
                            <p className="text-[15px] font-bold uppercase tracking-[0.28em]">Bizionary CRM</p>
                            <p className="mt-1 text-[11px] leading-4 text-secondary">
                                Main Boulevard, Lahore
                                <br />
                                info@bizionary.com | +92 300 0000000
                            </p>

                            <div className="mt-4 border-t border-dashed border-card pt-3 text-left text-[11px] leading-5 text-primary">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-medium text-secondary">Date:</span>
                                    <span className="text-right">{saleDate}{saleTime ? ` ${saleTime}` : ''}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-medium text-secondary">Receipt No:</span>
                                    <span className="text-right">{saleIdLabel}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-medium text-secondary">Customer:</span>
                                    <span className="max-w-[180px] text-right">{sale?.customer_name || 'N/A'}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-medium text-secondary">Payment:</span>
                                    <span className="text-right">{paymentMethod}</span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-medium text-secondary">Status:</span>
                                    <span className="text-right">{paymentStatus}</span>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-dashed border-card pt-3 text-left">
                                <div className="grid grid-cols-[1fr_auto] gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                                    <span>Item</span>
                                    <span className="text-right">Total</span>
                                </div>

                                <div className="mt-2 space-y-2 border-t border-dashed border-card pt-2 text-[11px] leading-5 text-primary">
                                    {slipItems.map((item, index) => (
                                        <div key={`${item.product_code}-${index}`} className="grid grid-cols-[1fr_auto] gap-3">
                                            <div>
                                                <span className="font-medium">{item.quantity_sold}x {item.product_name}</span>
                                                <span className="ml-1 text-secondary">({formatPKR(item.unit_price)})</span>
                                            </div>
                                            <div className="text-right font-medium">{formatPKR(item.total_price)}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 border-t border-dashed border-card pt-3 text-[11px] text-primary">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Products</span>
                                        <span>{itemCountLabel}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span>Qty Sold</span>
                                        <span>{totalItems}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-dashed border-card pt-3 text-[11px] text-primary">
                                <div className="flex items-center justify-between gap-3">
                                    <span>Subtotal</span>
                                    <span>{formatPKR(totalPrice)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span>Discount</span>
                                    <span>{formatPKR(discount)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 border-t border-dashed border-card pt-2">
                                    <span className="text-sm font-semibold text-primary">Grand Total</span>
                                    <span className="text-base font-bold text-primary">{formatPKR(grandTotal)}</span>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-dashed border-card pt-3 text-center text-[11px] text-secondary">
                                Thank you for shopping with us.
                            </div>
                        </div>
                    </div>

                    <div className="sale-slip-no-print flex items-center justify-between gap-3 px-1 pb-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-md border border-card bg-card px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-page print:hidden"
                        >
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center justify-center rounded-md border border-card bg-card px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-page print:hidden"
                        >
                            <Printer className="mr-2 h-4 w-4 text-secondary" />
                            Print
                        </button>
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-card transition-colors hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70 print:hidden"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {isDownloading ? 'Downloading...' : 'Download'}
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

export default SaleSlipModal;