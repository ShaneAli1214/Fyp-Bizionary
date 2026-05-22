import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Frontend Diagnostic Component
 * Tests the connection between frontend and API
 * Shows what data is being received and how it's formatted
 */
export default function FrontendDiagnostic() {
    const [diagnostics, setDiagnostics] = useState({
        apiUrl: 'http://127.0.0.1:8000/api/insights/live/',
        frontendUrl: window.location.href,
        status: 'Testing...',
        response: null,
        error: null,
        timestamp: new Date().toLocaleTimeString(),
    });

    useEffect(() => {
        const runDiagnostics = async () => {
            console.log('🔍 Starting frontend diagnostics...');
            
            try {
                console.log('📡 Making API request to:', diagnostics.apiUrl);
                
                const response = await fetch(diagnostics.apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                });

                console.log('📥 Response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers),
                });

                const jsonData = await response.json();
                console.log('✅ JSON parsed successfully:', jsonData);

                if (jsonData.data) {
                    console.log('📊 Data structure:', {
                        total_revenue: jsonData.data.total_revenue,
                        total_sales: jsonData.data.total_sales,
                        hot_products_count: jsonData.data.hot_products?.length,
                        cold_products_count: jsonData.data.cold_products?.length,
                        restocking_needed_count: jsonData.data.restocking_needed?.length,
                        sales_trend_count: jsonData.data.sales_trend?.length,
                    });
                }

                setDiagnostics(prev => ({
                    ...prev,
                    status: 'Connected ✓',
                    response: jsonData,
                    error: null,
                }));
            } catch (err) {
                console.error('❌ Diagnostic error:', err);
                setDiagnostics(prev => ({
                    ...prev,
                    status: 'Failed ✗',
                    error: err.message,
                    response: null,
                }));
            }
        };

        runDiagnostics();
        // Re-run every 5 seconds
        const interval = setInterval(runDiagnostics, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Frontend Diagnostic</h1>

                {/* Status Card */}
                <div className={`p-6 rounded-lg border-2 ${
                    diagnostics.status.includes('Connected')
                        ? 'bg-green-50 border-green-300'
                        : 'bg-red-50 border-red-300'
                }`}>
                    <div className="flex items-center gap-3">
                        {diagnostics.status.includes('Connected') ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        )}
                        <div>
                            <p className="font-semibold text-gray-900">API Status</p>
                            <p className="text-sm text-gray-600">{diagnostics.status}</p>
                        </div>
                    </div>
                </div>

                {/* URLs */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h2 className="font-semibold text-gray-900 mb-4">Connection Info</h2>
                    <div className="space-y-2 text-sm font-mono text-gray-700">
                        <p><span className="font-bold">API URL:</span> {diagnostics.apiUrl}</p>
                        <p><span className="font-bold">Frontend URL:</span> {diagnostics.frontendUrl}</p>
                        <p><span className="font-bold">Last Check:</span> {diagnostics.timestamp}</p>
                    </div>
                </div>

                {/* Error Display */}
                {diagnostics.error && (
                    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                        <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                        <p className="text-sm text-red-700 font-mono">{diagnostics.error}</p>
                    </div>
                )}

                {/* Response Data */}
                {diagnostics.response && (
                    <>
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <h2 className="font-semibold text-gray-900 mb-4">Response Summary</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Total Revenue</p>
                                    <p className="font-bold text-lg">₨{(diagnostics.response.data?.total_revenue || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Total Sales</p>
                                    <p className="font-bold text-lg">{diagnostics.response.data?.total_sales || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Hot Products</p>
                                    <p className="font-bold text-lg">{diagnostics.response.data?.hot_products?.length || 0}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Restocking Needed</p>
                                    <p className="font-bold text-lg">{diagnostics.response.data?.restocking_needed?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Raw JSON */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <h2 className="font-semibold text-gray-900 mb-4">Raw Response (JSON)</h2>
                            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs text-gray-700 max-h-96">
                                {JSON.stringify(diagnostics.response, null, 2)}
                            </pre>
                        </div>
                    </>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">Debug Instructions</h3>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                        <li>Open browser console (F12)</li>
                        <li>Look for green checkmarks ✓ in console</li>
                        <li>Check if "Connected ✓" appears above</li>
                        <li>If error appears, check browser console for details</li>
                        <li>Refresh page if needed</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
