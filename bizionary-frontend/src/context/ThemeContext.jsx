import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });
    const [palette, setPalette] = useState(() => {
        return localStorage.getItem('themePalette') || 'default';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Persist preference to localStorage
        localStorage.setItem('theme', theme);
        localStorage.setItem('themePalette', palette);
        
        // Explicitly handle theme toggle logic
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else if (theme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemPrefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }

        // Listener for system changes when set to 'system'
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (theme === 'system') {
                if (e.matches) {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Apply palette classes separately so users can mix light/dark mode with a theme palette
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
