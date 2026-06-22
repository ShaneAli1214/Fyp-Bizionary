import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Frontend Diagnostic Component
 * Tests the connection between frontend and API
 * Shows what data is being received and how it's formatted
 */
export default function FrontendDiagnostic() {
    const [diagnostics, setDiagnostics] = useState({
        apiUrl: '/api/insights/live/',
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
        <div className="p-8 bg-background min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-text-primary">Frontend Diagnostic</h1>

                {/* Status Card */}
                <div className={`p-6 rounded-lg border-2 ${
                    diagnostics.status.includes('Connected')
                        ? 'bg-surface border-success text-success'
                        : 'bg-surface border-danger text-danger'
                }`}>
                    <div className="flex items-center gap-3">
                        {diagnostics.status.includes('Connected') ? (
                            <CheckCircle className="w-6 h-6 text-success" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-danger" />
                        )}
                        <div>
                            <p className="font-semibold text-text-primary">API Status</p>
                            <p className="text-sm text-text-secondary">{diagnostics.status}</p>
                        </div>
                    </div>
                </div>

                {/* URLs */}
                <div className="bg-surface p-6 rounded-lg border border-border">
                    <h2 className="font-semibold text-text-primary mb-4">Connection Info</h2>
                    <div className="space-y-2 text-sm font-mono text-text-secondary">
                        <p><span className="font-bold text-text-primary">API URL:</span> {diagnostics.apiUrl}</p>
                        <p><span className="font-bold text-text-primary">Frontend URL:</span> {diagnostics.frontendUrl}</p>
                        <p><span className="font-bold text-text-primary">Last Check:</span> {diagnostics.timestamp}</p>
                    </div>
                </div>

                {/* Error Display */}
                {diagnostics.error && (
                    <div className="bg-surface p-6 rounded-lg border border-danger">
                        <h3 className="font-semibold text-danger mb-2">Error</h3>
                        <p className="text-sm text-danger font-mono">{diagnostics.error}</p>
                    </div>
                )}

                {/* Response Data */}
                {diagnostics.response && (
                    <>
                        <div className="bg-surface p-6 rounded-lg border border-border">
                            <h2 className="font-semibold text-text-primary mb-4">Response Summary</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-text-secondary">Total Revenue</p>
                                    <p className="font-bold text-lg text-text-primary">₨{(diagnostics.response.data?.total_revenue || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary">Total Sales</p>
                                    <p className="font-bold text-lg text-text-primary">{diagnostics.response.data?.total_sales || 0}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary">Hot Products</p>
                                    <p className="font-bold text-lg text-text-primary">{diagnostics.response.data?.hot_products?.length || 0}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary">Restocking Needed</p>
                                    <p className="font-bold text-lg text-text-primary">{diagnostics.response.data?.restocking_needed?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Raw JSON */}
                        <div className="bg-surface p-6 rounded-lg border border-border">
                            <h2 className="font-semibold text-text-primary mb-4">Raw Response (JSON)</h2>
                            <pre className="bg-background p-4 rounded overflow-auto text-xs text-text-secondary max-h-96">
                                {JSON.stringify(diagnostics.response, null, 2)}
                            </pre>
                        </div>
                    </>
                )}

                {/* Instructions */}
                <div className="bg-surface p-6 rounded-lg border border-accent">
                    <h3 className="font-semibold text-accent mb-2">Debug Instructions</h3>
                    <ol className="list-decimal list-inside text-sm text-text-secondary space-y-1">
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
