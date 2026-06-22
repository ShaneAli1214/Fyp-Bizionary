import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, ShoppingBag } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Skeleton from '../../components/ui/Skeleton';
import { formatPKR } from '../../utils/currency';
import api from '../../services/api';
import PurchaseForm from './PurchaseForm';
import { PRODUCT_CATEGORIES, normalizeProductCategory, getCategoryLabel } from '../../utils/productCategories';

const PurchasesList = () => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentPurchase, setCurrentPurchase] = useState(null);

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const res = await api.get('purchases/');
            let data = res.data.data || res.data;
            setPurchases(data);
        } catch (error) {
            console.warn('Failed to fetch purchases from backend.');
            setPurchases([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async (purchaseData) => {
        try {
            if (currentPurchase) {
                await api.put(`purchases/${currentPurchase.id}/`, purchaseData);
            } else {
                await api.post('purchases/', purchaseData);
            }
            await fetchPurchases();
            setIsFormOpen(false);
            setCurrentPurchase(null);
        } catch (error) {
            alert("Failed to save purchase.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`purchases/${id}/`);
            await fetchPurchases();
        } catch (error) {
            alert("Failed to delete purchase.");
        }
    };

    const openAddForm = () => {
        setCurrentPurchase(null);
        setIsFormOpen(true);
    };

    const openEditForm = (item) => {
        setCurrentPurchase(item);
        setIsFormOpen(true);
    };

    const filteredPurchases = purchases.filter(p =>
        (
            (p.product_name && p.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.company_name && p.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            p.id.toString().includes(searchTerm)
        ) &&
        (categoryFilter === 'ALL' || normalizeProductCategory(p.product_category) === categoryFilter)
    );

    return (
        <div className="space-y-6">

            <PageHeader title="Purchases" subtitle="Track vendor purchase orders and incoming stock." />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-secondary" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-card rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm bg-surface shadow-sm text-textMain placeholder-textMuted"
                        placeholder="Search by product, company, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full sm:w-44 pl-9 pr-3 py-2 border border-card rounded-xl text-sm bg-surface text-textMain outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="ALL">All Categories</option>
                            {PRODUCT_CATEGORIES.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={openAddForm}
                        className="flex items-center justify-center px-5 py-2 bg-primary text-card rounded-full text-sm font-bold transition-all hover:opacity-85 active:scale-[0.98] shadow-sm w-full sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Purchase
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-bg-card rounded-2xl border border-border-card shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="p-6">
                        <Skeleton.TableRows count={7} cols={6} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-text-secondary text-xs uppercase tracking-wider border-b border-border-card">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">PO #</th>
                                    <th className="px-6 py-4 font-semibold">Date</th>
                                    <th className="px-6 py-4 font-semibold">Company</th>
                                    <th className="px-6 py-4 font-semibold">Category</th>
                                    <th className="px-6 py-4 font-semibold">Product</th>
                                    <th className="px-6 py-4 font-semibold text-center">Qty</th>
                                    <th className="px-6 py-4 font-semibold text-right">Total Cost</th>
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-card">
                                {filteredPurchases.map((p) => (
                                    <tr key={p.id} className="hover:bg-page transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-textMuted font-mono text-xs">PO-{p.id.toString().padStart(4, '0')}</td>
                                        <td className="px-6 py-4 text-textMuted">{p.purchase_date}</td>
                                        <td className="px-6 py-4 font-medium text-textMain">{p.company_name}</td>
                                        <td className="px-6 py-4 text-textMuted">{getCategoryLabel(p.product_category) || 'N/A'}</td>
                                        <td className="px-6 py-4 font-bold text-textMain">{p.product_name || `Product ID: ${p.product}`}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold text-text-secondary">
                                                {p.quantity_purchased}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-text-primary text-right">{formatPKR(p.total_cost)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => openEditForm(p)}
                                                    className="text-secondary hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="text-secondary hover:text-danger hover:fill-danger/10 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPurchases.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-textMuted">
                                            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                            <p>No purchase records found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <PurchaseForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateOrUpdate}
                initialData={currentPurchase}
            />
        </div>
    );
};

export default PurchasesList;
