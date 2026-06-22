import os
import re

src_dir = r"f:\New folder\FYP-Bizionary\bizionary-frontend\src"

replacements = [
    # 1. Page & Layout background colors
    (r'\bbg-slate-50/50\b', 'bg-page/50'),
    (r'\bbg-gray-50/50\b', 'bg-page/50'),
    (r'\bbg-slate-50\b', 'bg-page'),
    (r'\bbg-gray-50\b', 'bg-page'),
    (r'\bbg-slate-100\b', 'bg-page'),
    (r'\bbg-gray-100\b', 'bg-page'),
    (r'\bbg-slate-200\b', 'bg-active-pill'),
    (r'\bbg-gray-200\b', 'bg-active-pill'),
    (r'\bbg-slate-300\b', 'bg-active-pill'),
    (r'\bbg-gray-300\b', 'bg-active-pill'),
    (r'\bbg-slate-800\b', 'bg-primary'),
    (r'\bbg-gray-800\b', 'bg-primary'),
    (r'\bbg-slate-900\b', 'bg-primary'),
    (r'\bbg-gray-900\b', 'bg-primary'),
    (r'\bbg-slate-950\b', 'bg-primary'),
    (r'\bbg-gray-950\b', 'bg-primary'),
    (r'\bbg-black\b', 'bg-primary'),

    # 2. Text colors
    (r'\btext-slate-950\b', 'text-primary'),
    (r'\btext-gray-950\b', 'text-primary'),
    (r'\btext-slate-900\b', 'text-primary'),
    (r'\btext-gray-900\b', 'text-primary'),
    (r'\btext-slate-800\b', 'text-primary'),
    (r'\btext-gray-800\b', 'text-primary'),
    (r'\btext-slate-700\b', 'text-primary'),
    (r'\btext-gray-700\b', 'text-primary'),
    (r'\btext-black\b', 'text-primary'),
    (r'\btext-slate-600\b', 'text-secondary'),
    (r'\btext-gray-600\b', 'text-secondary'),
    (r'\btext-slate-500\b', 'text-secondary'),
    (r'\btext-gray-500\b', 'text-secondary'),
    (r'\btext-slate-400\b', 'text-secondary'),
    (r'\btext-gray-400\b', 'text-secondary'),
    (r'\btext-white\b', 'text-card'),

    # 3. Borders
    (r'\bborder-slate-100\b', 'border-card'),
    (r'\bborder-gray-100\b', 'border-card'),
    (r'\bborder-slate-200/85\b', 'border-card'),
    (r'\bborder-slate-200/80\b', 'border-card'),
    (r'\bborder-slate-200/50\b', 'border-card'),
    (r'\bborder-slate-200\b', 'border-card'),
    (r'\bborder-gray-200\b', 'border-card'),
    (r'\bborder-slate-300\b', 'border-card'),
    (r'\bborder-gray-300\b', 'border-card'),
    (r'\bborder-white/10\b', 'border-card/50'),
    (r'\bborder-white/20\b', 'border-card/50'),
    (r'\bborder-white\b', 'border-card'),
    (r'\bborder-black\b', 'border-primary'),

    # 4. Brand / Navy Colors (#1C3A5A)
    (r'\bbg-\[#1C3A5A\]/10\b', 'bg-active-pill/30'),
    (r'\bbg-\[#1C3A5A\]/5\b', 'bg-active-pill/20'),
    (r'\bbg-\[#1C3A5A\]\b', 'bg-primary'),
    (r'\bhover:bg-\[#2B527E\]\b', 'hover:bg-active-pill/40'),
    (r'\btext-\[#1C3A5A\]/80\b', 'text-primary'),
    (r'\btext-\[#1C3A5A\]\b', 'text-primary'),
    (r'\bborder-\[#1C3A5A\]/10\b', 'border-card'),
    (r'\bborder-\[#1C3A5A\]/20\b', 'border-card'),
    (r'\bborder-\[#1C3A5A\]\b', 'border-primary'),
    (r'\bfocus:border-\[#1C3A5A\]\b', 'focus:border-primary'),
    (r'\bfocus:ring-\[#1C3A5A\]/20\b', 'focus:ring-primary/20'),
    (r'#1C3A5A', '#2B2620'),
    (r'#2B527E', '#2B2620'),

    # 5. Blue / Indigo / Purple / Violet
    (r'\bbg-blue-50/80\b', 'bg-active-pill/20'),
    (r'\bbg-blue-50\b', 'bg-active-pill/20'),
    (r'\bbg-indigo-50\b', 'bg-active-pill/20'),
    (r'\bbg-purple-50\b', 'bg-active-pill/20'),
    (r'\bbg-blue-100\b', 'bg-active-pill'),
    (r'\bbg-indigo-100\b', 'bg-active-pill'),
    (r'\bbg-purple-100\b', 'bg-active-pill'),
    (r'\bbg-blue-600\b', 'bg-status-info'),
    (r'\bbg-indigo-600\b', 'bg-status-info'),
    (r'\bbg-purple-600\b', 'bg-status-info'),
    (r'\bbg-blue-500\b', 'bg-status-info'),
    (r'\btext-blue-600\b', 'text-status-info'),
    (r'\btext-indigo-600\b', 'text-status-info'),
    (r'\btext-purple-600\b', 'text-status-info'),
    (r'\btext-blue-500\b', 'text-status-info'),
    (r'\btext-blue-700\b', 'text-status-info'),
    (r'\btext-indigo-700\b', 'text-status-info'),

    # 6. Green / Emerald / Teal
    (r'\bbg-green-50\b', 'bg-status-success/10'),
    (r'\bbg-emerald-50\b', 'bg-status-success/10'),
    (r'\bbg-green-100\b', 'bg-status-success/20'),
    (r'\bbg-emerald-100\b', 'bg-status-success/20'),
    (r'\bbg-green-600\b', 'bg-status-success'),
    (r'\bbg-emerald-600\b', 'bg-status-success'),
    (r'\bbg-green-500\b', 'bg-status-success'),
    (r'\bbg-emerald-500\b', 'bg-status-success'),
    (r'\btext-green-650\b', 'text-status-success'),
    (r'\btext-green-600\b', 'text-status-success'),
    (r'\btext-emerald-600\b', 'text-status-success'),
    (r'\btext-green-700\b', 'text-status-success'),
    (r'\btext-emerald-700\b', 'text-status-success'),
    (r'\btext-green-800\b', 'text-status-success'),
    (r'\btext-emerald-800\b', 'text-status-success'),
    (r'\bborder-green-200\b', 'border-card'),
    (r'\bborder-emerald-200\b', 'border-card'),

    # 7. Red / Rose / Orange / Yellow / Amber
    (r'\bbg-red-50\b', 'bg-status-info/10'),
    (r'\bbg-rose-50\b', 'bg-status-info/10'),
    (r'\bbg-red-100\b', 'bg-status-info/20'),
    (r'\bbg-rose-100\b', 'bg-status-info/20'),
    (r'\bbg-amber-100\b', 'bg-status-info/20'),
    (r'\bbg-yellow-100\b', 'bg-status-info/20'),
    (r'\bbg-red-650\b', 'bg-status-info'),
    (r'\bbg-red-600\b', 'bg-status-info'),
    (r'\bbg-rose-600\b', 'bg-status-info'),
    (r'\bbg-red-500\b', 'bg-status-info'),
    (r'\bbg-amber-500\b', 'bg-status-info'),
    (r'\btext-red-600\b', 'text-status-info'),
    (r'\btext-rose-600\b', 'text-status-info'),
    (r'\btext-red-700\b', 'text-status-info'),
    (r'\btext-rose-700\b', 'text-status-info'),
    (r'\btext-amber-700\b', 'text-status-info'),
    (r'\btext-red-800\b', 'text-status-info'),
    (r'\btext-amber-800\b', 'text-status-info'),
    (r'\btext-orange-700\b', 'text-status-info'),
    (r'\bborder-red-200\b', 'border-card'),
    (r'\bborder-rose-200\b', 'border-card'),
    (r'\bhover:bg-rose-50\b', 'hover:bg-active-pill/20'),
    (r'\bhover:bg-red-50\b', 'hover:bg-active-pill/20'),

    # 8. bg-white replacement (to bg-card for component styling)
    (r'\bbg-white\b', 'bg-card'),
]

# Compile patterns for efficiency
compiled_replacements = []
for pattern, replacement in replacements:
    compiled_replacements.append((re.compile(pattern), replacement))

count = 0
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx'):
            file_path = os.path.join(root, file)
            # Skip Sidebar.jsx since we manually rewrote it
            if 'Sidebar.jsx' in file_path:
                continue
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified_content = content
            for regex, rep in compiled_replacements:
                modified_content = regex.sub(rep, modified_content)
            
            if modified_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                print(f"Updated: {os.path.relpath(file_path, src_dir)}")
                count += 1

print(f"Completed color cleanup. Total files modified: {count}")
