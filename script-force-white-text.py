import os
import re

target_dirs = [
    '/Users/manthanjaiswal/swimming-pool-system/components/business',
    '/Users/manthanjaiswal/swimming-pool-system/app/business/[businessSlug]/admin'
]

rules = [
    # Strip any dark: prefixes from text colors just to be safe
    (r'text-slate-900', 'text-white font-bold'), # Make it clearly visible
    (r'text-slate-800', 'text-white'),
    (r'text-slate-700', 'text-white'),
    
    # Make headers pure white instead of zinc-300
    (r'text-zinc-300', 'text-white'),
    (r'text-zinc-400', 'text-white'),
    (r'text-zinc-500', 'text-white'),
    
    (r'dark:text-white', ''), # Clean up redundancy
    
    # CRITICAL: Force all light backgrounds to black/dark gray so white text is visible!
    (r'bg-white', 'bg-black'),
    (r'bg-slate-50', 'bg-black'),
    (r'bg-slate-100', 'bg-[#111111]'),
    (r'bg-slate-200', 'bg-[#1a1a1a]'),
    
    # Force dark borders instead of light ones
    (r'border-slate-100', 'border-white/10'),
    (r'border-slate-200', 'border-white/10'),
    (r'border-slate-300', 'border-white/20'),
]

for d in target_dirs:
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                original = content
                for pattern, repl in rules:
                    content = re.sub(pattern, repl, content)
                
                if original != content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(content)
                    print(f'Updated: {path}')

print('Forced all text to bright white and backgrounds to black.')
