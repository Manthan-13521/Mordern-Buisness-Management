import os
import re

target_dirs = [
    '/Users/manthanjaiswal/swimming-pool-system/components/business',
    '/Users/manthanjaiswal/swimming-pool-system/app/business/[businessSlug]/admin'
]

rules = [
    # Make dim text brighter
    (r'text-slate-600', 'text-zinc-300'),
    (r'text-slate-500', 'text-zinc-300'),
    (r'text-slate-400', 'text-zinc-300'),
    
    # Make standard text pure white
    (r'text-slate-300', 'text-white'),
    (r'text-slate-200', 'text-white'),
    (r'text-slate-100', 'text-white'),
    
    # Remove dark: prefixes for text colors just in case they're acting up, though replacing the slate text ensures brightness.
    (r'text-white\/5', 'text-white/20'), # brighten subtle dividers slightly
    
    # Ensure pure black backgrounds where there was some transparency or off-black
    (r'bg-\[\#111\]', 'bg-black'),
    (r'bg-white\/2', 'bg-black'),
    (r'bg-white\/5', 'bg-zinc-900'), 
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

print('Text brightness conversion complete.')
