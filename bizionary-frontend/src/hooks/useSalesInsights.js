import { useState, useEffect } from 'react';
import api from '../services/api';

const PERIOD_OPTIONS = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'last10Days', label: 'Last 10 Days' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'all', label: 'All Sales History' },
];

const DEFAULT_PERIOD = 'last10Days';

const useSalesInsights = () => {
    const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_PERIOD);
    const [selectedData, setSelectedData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetchSalesData = async () => {
            try {
                setLoading(true);
                const res = await api.get('dashboard/sales-by-period/', {
                    params: { period: selectedPeriod }
                });
                if (active && res.data) {
                    setSelectedData(res.data);
                }
            } catch (error) {
                console.warn('Failed to fetch sales insights from backend API, using fallback structure.', error);
                if (active) {
                    setSelectedData({
                        period: selectedPeriod,
                        periodLabel: selectedPeriod === 'daily' ? 'Daily' : selectedPeriod === 'weekly' ? 'Weekly' : selectedPeriod === 'last10Days' ? 'Last 10 Days' : selectedPeriod === 'monthly' ? 'Monthly' : 'All Sales History',
                        dateContext: '',
                        xAxisType: selectedPeriod === 'daily' ? 'hour' : selectedPeriod === 'monthly' ? 'week' : selectedPeriod === 'all' ? 'month' : 'day',
                        xAxisLabel: '',
                        totalSalesAmount: 0,
                        totalProfit: 0,
                        totalQuantity: 0,
                        categories: [],
                        chartData: []
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
    }, [selectedPeriod]);

    return {
        periodOptions: PERIOD_OPTIONS,
        selectedPeriod,
        setSelectedPeriod,
        selectedData,
        loading,
    };
};

export default useSalesInsights;