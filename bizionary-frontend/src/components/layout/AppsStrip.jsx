import React from 'react';
import { useNavigate } from 'react-router-dom';

const AppsStrip = ({ compact }) => {
    const navigate = useNavigate();
    const apps = [
        { label: 'Dashboard', path: '/', desc: 'Home overview' },
        { label: 'Smart Reorder', path: '/smart-reorder', desc: 'Reorder engine' },
        { label: 'Products', path: '/products', desc: 'Catalog' },
        { label: 'Sales', path: '/sales', desc: 'Orders & reports' },
        { label: 'Inventory', path: '/inventory-managment', desc: 'Stock control' },
        { label: 'Accounts', path: '/accounts', desc: 'Finance' }
    ];

    return (
        <div className={`apps-strip ${compact ? 'px-2 py-2' : 'p-4'} bg-surface rounded-2xl border border-surface/10 shadow-sm`}> 
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-textMain">Apps</h3>
                <div className="flex items-center gap-4">
                    <button className="text-xs text-textMuted">Filter</button>
                    <button onClick={() => navigate('/apps/add')} className="text-xs text-primary font-semibold flex items-center gap-2">Add Apps</button>
                </div>
            </div>

            <div className={`apps-cards ${compact ? 'apps-cards-compact' : 'apps-cards-grid'}`}>
                {apps.map((app) => (
                    <div key={app.label} onClick={() => navigate(app.path)} className="apps-card bg-background/50 rounded-xl p-3 border border-surface/8 flex items-center gap-3 cursor-pointer hover:shadow-md">
                        <div className="apps-card-icon w-10 h-10 rounded flex items-center justify-center text-card font-bold" aria-hidden>
                            {app.label.split(' ').map(w => w[0]).join('').slice(0,2)}
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-textMain truncate">{app.label}</div>
                            <div className="text-[11px] text-textMuted truncate">{app.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AppsStrip;
