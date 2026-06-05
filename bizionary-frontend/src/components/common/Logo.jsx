import React from 'react';

const Logo = ({ className = 'h-10 w-auto', ...props }) => {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="10 5 82 82" 
            className={className} 
            {...props}
        >
            {/* Pillar 1 (Left, Short) */}
            <path
                d="M 16,66 V 55 L 23,51.5 V 66 Z"
                fill="#00BFA5"
            />
            {/* Pillar 2 (Middle, Medium) */}
            <path
                d="M 27,66 V 43 L 34,39.5 V 66 Z"
                fill="#008B9B"
            />
            {/* Pillar 3 (Right, Tall / Part of B) */}
            <path
                d="M 38,66 V 31 L 45,27.5 V 66 Z"
                fill="#005F6E"
            />
            
            {/* Outer B Outline - drawn to overlay the pillars correctly */}
            <path
                d="M 38,51 V 24 L 62,10 L 86,24 V 38 L 72,46 L 86,54 V 68 L 62,82 L 38,68 V 65"
                fill="none"
                stroke="currentColor"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default Logo;
