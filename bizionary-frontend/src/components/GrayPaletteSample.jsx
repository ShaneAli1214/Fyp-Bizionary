import React from 'react';
import '../styles/colors.css';

const shades = [50,100,200,300,400,500,600,700,800,900];

export default function GrayPaletteSample(){
    return (
        <div className="p-8">
            <h1 className="text-2xl font-semibold mb-6 text-textMain">Grey Palette Sample</h1>
            <div className="grid grid-cols-5 gap-4">
                {shades.map(s => (
                    <div key={s} className={`rounded-md p-4 border border-card shadow-sm flex flex-col items-start`}>
                        <div className={`w-full h-20 rounded-md mb-3 bg-grey-${s}`} style={{backgroundColor: `var(--grey-${s})`}} />
                        <div className="text-sm text-secondary">grey-{s}</div>
                        <div className="text-xs text-secondary mt-1">{`var(--grey-${s})`}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
