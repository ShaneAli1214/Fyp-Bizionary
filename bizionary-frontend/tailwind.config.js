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
                // ── Semantic aliases that map to dynamic CSS variables ──
                primary:    'var(--color-textMain)',
                'primary-dark': 'var(--color-textMain)',
                accent:     'var(--color-accent)',
                background: 'var(--color-background)',
                surface:    'var(--color-surface)',
                textMain:   'var(--color-textMain)',
                textMuted:  'var(--color-textMuted)',
                border:     'var(--color-border)',
                success:    'var(--color-success)',
                danger:     'var(--color-danger)',
                warning:    'var(--color-warning)',

                // ── The 10 reference design tokens (strict) ──
                'bg-page':       '#F1EBE3',
                'bg-card':       '#FFFFFF',
                'border-card':   '#E8E0D3',
                'text-primary':  '#2B2620',
                'text-secondary':'#9C9387',
                'active-pill':   '#DCD3C5',
                'chart-accent':  '#B7A893',
                'chart-track':   '#E8E0D3',
                'status-success':'#8FA888',
                'status-info':   '#C9A86A',
            }
        },
    },
    plugins: [],
}
