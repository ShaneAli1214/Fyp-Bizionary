import React, { useState, useEffect } from 'react';

/**
 * Troubleshooting page to identify frontend/backend communication issues
 */
export default function Troubleshoot() {
    const [status, setStatus] = useState({
        apiUrl: 'http://127.0.0.1:8000/api/insights/live/',
        backendConnected: false,
        backendError: null,
        backendResponse: null,
        corsHeaders: null,
        loading: true,
    });

    useEffect(() => {
        const diagnose = async () => {
            console.log('🔍 Starting troubleshooting...');
            
            try {
                // Test 1: Direct fetch to backend
                console.log('📡 Test 1: Connecting to backend...');
                const response = await fetch(status.apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                console.log('Response status:', response.status);
                console.log('CORS Headers:', {
                    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                    'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
                });

                const jsonData = await response.json();
                console.log('✅ Backend response:', jsonData);

                setStatus(prev => ({
                    ...prev,
                    backendConnected: true,
                    backendResponse: jsonData,
                    corsHeaders: Object.fromEntries(response.headers),
                    loading: false,
                }));
            } catch (err) {
                console.error('❌ Error:', err);
                setStatus(prev => ({
                    ...prev,
                    backendError: err.message,
                    loading: false,
                }));
            }
        };

        diagnose();
    }, []);

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🔍 Troubleshooting</h1>

                {status.loading && (
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                        <p>Testing backend connection...</p>
                    </div>
                )}

                {!status.loading && (
                    <>
                        {/* Backend Connection Test */}
                        <div className={`p-6 rounded-lg border-2 mb-6 ${
                            status.backendConnected
                                ? 'bg-green-50 border-green-300'
                                : 'bg-red-50 border-red-300'
                        }`}>
                            <h2 className="font-bold text-lg mb-2">
                                Backend Connection: {status.backendConnected ? '✅ SUCCESS' : '❌ FAILED'}
                            </h2>
                            <p className="text-sm">API URL: {status.apiUrl}</p>
                            {status.backendError && (
                                <p className="text-red-600 font-mono text-sm mt-2">{status.backendError}</p>
                            )}
                        </div>

                        {/* Response Data */}
                        {status.backendResponse && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                                <h2 className="font-bold text-lg mb-4">Response Data</h2>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Total Revenue</p>
                                        <p className="font-bold">₨{status.backendResponse.data?.total_revenue?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Total Sales</p>
                                        <p className="font-bold">{status.backendResponse.data?.total_sales}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Hot Products</p>
                                        <p className="font-bold">{status.backendResponse.data?.hot_products?.length || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Cold Products</p>
                                        <p className="font-bold">{status.backendResponse.data?.cold_products?.length || 0}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Raw JSON */}
                        {status.backendResponse && (
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <h2 className="font-bold text-lg mb-4">Full Response (JSON)</h2>
                                <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs max-h-96">
                                    {JSON.stringify(status.backendResponse, null, 2)}
                                </pre>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
