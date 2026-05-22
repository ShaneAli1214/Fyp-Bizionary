import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/auth/Login';
import DashboardLayout from '../components/layout/DashboardLayout';
import Dashboard from '../pages/dashboard/Dashboard';
import ProductList from '../pages/products/ProductList';
import SalesList from '../pages/sales/SalesList';
import PurchasesList from '../pages/purchases/PurchasesList';
import InvoicesList from '../pages/invoices/InvoicesList';
import UserManagement from '../pages/user-management/UserManagement';
import AccountsManager from '../pages/accounts/AccountsManager';
import Settings from '../pages/settings/Settings';
import InventoryManagment from '../pages/inventory-managment/InventoryManagment';
import OrderedSlips from '../pages/ordered-slips/OrderedSlips';
import AIInsights from '../pages/insights/AIInsights';
import SmartReorderEngine from '../pages/insights/SmartReorderEngine';
import FrontendDiagnostic from '../pages/insights/FrontendDiagnostic';
import Troubleshoot from '../pages/insights/Troubleshoot';
import GrayPaletteSample from '../components/GrayPaletteSample';

// Placeholders for other pages
const Placeholder = ({ title }) => (
    <div className="flex h-full items-center justify-center p-8 bg-surface rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-400">{title} Content Coming Soon</h2>
    </div>
);

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/diagnostic" element={<FrontendDiagnostic />} />
            <Route path="/troubleshoot" element={<Troubleshoot />} />

            {/* Protected Routes configured to use DashboardLayout */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<ProductList />} />
                <Route path="sales" element={<SalesList />} />
                <Route path="purchases" element={<PurchasesList />} />
                <Route path="invoices" element={<InvoicesList />} />
                <Route path="inventory-managment" element={<InventoryManagment />} />
                <Route path="ordered-slips" element={<OrderedSlips />} />
                <Route path="accounts" element={<AccountsManager />} />
                <Route path="settings" element={<Settings />} />
                <Route path="user-management" element={<UserManagement />} />
                <Route path="insights" element={<AIInsights />} />
                <Route path="smart-reorder" element={<SmartReorderEngine />} />
                <Route path="palette" element={<GrayPaletteSample />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
