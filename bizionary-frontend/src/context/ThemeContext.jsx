import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Locked to dark mode
    const theme = 'dark';
    const setTheme = () => {}; // No-op to prevent errors in caller components

    const [palette, setPalette] = useState(() => {
        return localStorage.getItem('themePalette') || 'default';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Persist preference to localStorage
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('themePalette', palette);
        
        // Always enforce dark mode
        root.classList.add('dark');
    }, []);

    // Apply palette classes separately so users can mix dark mode with a theme palette
    useEffect(() => {
        const root = window.document.documentElement;
        // remove existing theme- classes
        Array.from(root.classList).filter(c=>c.startsWith('theme-')).forEach(c => root.classList.remove(c));
        if (palette && palette !== 'default') {
            root.classList.add(`theme-${palette}`);
        }

        // persist palette selection immediately
        try {
            localStorage.setItem('themePalette', palette);
        } catch (e) {
            // ignore storage errors
        }
    }, [palette]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, palette, setPalette }}>
            {children}
        </ThemeContext.Provider>
    );
};
