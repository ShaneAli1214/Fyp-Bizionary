import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/auth/Login';
import ResetDefaultPassword from '../pages/auth/ResetDefaultPassword';
import DashboardLayout from '../components/layout/DashboardLayout';
import Dashboard from '../pages/dashboard/Dashboard';
import ProductList from '../pages/products/ProductList';
import BulkProductUpload from '../pages/products/BulkProductUpload';
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
import Chatbot from '../pages/chatbot/Chatbot';
import DemoShell from '../pages/demo/DemoShell';

// Placeholders for other pages
const Placeholder = ({ title }) => (
    <div className="flex h-full items-center justify-center p-8 bg-surface rounded-2xl border border-card shadow-sm">
        <h2 className="text-2xl font-bold text-secondary">{title} Content Coming Soon</h2>
    </div>
);

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
                path="/reset-default-password" 
                element={
                    <ProtectedRoute allowForcePasswordChange={true}>
                        <ResetDefaultPassword />
                    </ProtectedRoute>
                } 
            />
            <Route path="/diagnostic" element={<FrontendDiagnostic />} />
            <Route path="/troubleshoot" element={<Troubleshoot />} />
            <Route path="/demo-shell" element={<DemoShell />} />

            {/* Protected Routes configured to use DashboardLayout */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route 
                    path="products" 
                    element={
                        <ProtectedRoute forbiddenRoles={['Accountant']}>
                            <ProductList />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="products/bulk-upload" 
                    element={
                        <ProtectedRoute>
                            <BulkProductUpload />
                        </ProtectedRoute>
                    } 
                />
                <Route path="sales" element={<SalesList />} />
                <Route path="purchases" element={<PurchasesList />} />
                <Route path="invoices" element={<InvoicesList />} />
                <Route 
                    path="inventory-managment" 
                    element={
                        <ProtectedRoute forbiddenRoles={['Accountant']}>
                            <InventoryManagment />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="stock" 
                    element={
                        <ProtectedRoute forbiddenRoles={['Accountant']}>
                            <Navigate to="/inventory-managment" replace />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="ordered-slips" 
                    element={
                        <ProtectedRoute forbiddenRoles={['Accountant']}>
                            <OrderedSlips />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="create-order" 
                    element={
                        <ProtectedRoute forbiddenRoles={['Accountant']}>
                            <Navigate to="/ordered-slips" replace />
                        </ProtectedRoute>
                    } 
                />
                <Route path="accounts" element={<AccountsManager />} />
                <Route path="settings" element={<Settings />} />
                <Route 
                    path="user-management" 
                    element={
                        <ProtectedRoute forbiddenRoles={['Accountant']}>
                            <UserManagement />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="admin" 
                    element={
                        <ProtectedRoute forbiddenRoles={['Accountant']}>
                            <Navigate to="/user-management" replace />
                        </ProtectedRoute>
                    } 
                />
                <Route path="insights" element={<AIInsights />} />
                <Route path="smart-reorder" element={<SmartReorderEngine />} />
                <Route path="chatbot" element={<Chatbot />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
