/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#4F46E5",
                'primary-dark': "#4338CA",
                accent: "#06B6D4",
                'accent-dark': "#0891B2",
                background: "#F8FAFC",
                'background-dark': '#0F172A',
                surface: "#FFFFFF",
                'surface-dark': '#0B1220',
                'ai-purple': '#8b5cf6',
                textMain: "#0f172a",
                textMuted: "#94A3B8",
                success: "#10B981",
                danger: "#EF4444",
                warning: "#F59E0B"
                ,
                grey: {
                    50: '#F7F8FA',
                    100: '#F1F3F5',
                    200: '#E6E9EE',
                    300: '#D0D5DB',
                    400: '#B9BEC7',
                    500: '#94A0AF',
                    600: '#6E7A86',
                    700: '#47515A',
                    800: '#2C343A',
                    900: '#0B0D10'
                }
            }
        },
    },
    plugins: [],
}
