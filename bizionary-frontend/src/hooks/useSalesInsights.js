import { useState, useEffect } from 'react';
import api from '../services/api';

const PERIOD_OPTIONS = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'last10Days', label: 'Last 10 Days' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'all', label: 'All Data' },
];

const DEFAULT_PERIOD = 'last10Days';

const useSalesInsights = () => {
    const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_PERIOD);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedData, setSelectedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = () => setRefreshTrigger(prev => prev + 1);

    useEffect(() => {
        let active = true;
        const fetchSalesData = async () => {
            try {
                setLoading(true);
                const params = { period: selectedPeriod };
                if (selectedPeriod === 'monthly' && selectedMonth) {
                    params.month = selectedMonth;
                }
                const res = await api.get('dashboard/sales-by-period/', { params });
                if (active && res.data) {
                    setSelectedData(res.data);
                    // Set default month if not selected
                    if (selectedPeriod === 'monthly' && !selectedMonth && res.data.availableMonths && res.data.availableMonths.length > 0) {
                        setSelectedMonth(res.data.availableMonths[0].key);
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch sales insights from backend API, using fallback structure.', error);
                if (active) {
                    setSelectedData({
                        period: selectedPeriod,
                        periodLabel: selectedPeriod === 'daily' ? 'Daily' : selectedPeriod === 'weekly' ? 'Weekly' : selectedPeriod === 'last10Days' ? 'Last 10 Days' : selectedPeriod === 'monthly' ? 'Monthly' : 'All Data',
                        dateContext: '',
                        xAxisType: selectedPeriod === 'daily' ? 'hour' : selectedPeriod === 'monthly' ? 'week' : selectedPeriod === 'all' ? 'month' : 'day',
                        xAxisLabel: '',
                        totalSalesAmount: 0,
                        totalProfit: 0,
                        totalQuantity: 0,
                        categories: [],
                        chartData: [],
                        availableMonths: []
                    });
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchSalesData();

        return () => {
            active = false;
        };
    }, [selectedPeriod, selectedMonth, refreshTrigger]);

    return {
        periodOptions: PERIOD_OPTIONS,
        selectedPeriod,
        setSelectedPeriod,
        selectedMonth,
        setSelectedMonth,
        selectedData,
        loading,
        refresh,
    };
};

export default useSalesInsights;