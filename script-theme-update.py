import os
import re

target_dirs = [
    '/Users/manthanjaiswal/swimming-pool-system/components/business',
    '/Users/manthanjaiswal/swimming-pool-system/app/business/[businessSlug]/admin'
]

rules = [
    (r'bg-\[\#1e293b\]', 'bg-black'),
    (r'bg-\[\#0f172a\]', 'bg-black'),
    (r'indigo-600', 'purple-600'),
    (r'indigo-500', 'purple-600'), # 500 converted to 600 for better matching
    (r'indigo-400', 'purple-400'),
    (r'bg-slate-900\/50', 'bg-[#111] border-white/5'),
    (r'bg-slate-900', 'bg-black'),
    (r'bg-slate-800', 'bg-[#111]'),
    (r'text-slate-900 dark:text-white', 'text-white'),
    (r'bg-white dark:bg-black', 'bg-black'),
    (r'emerald-500', 'green-500'),
    (r'emerald-600', 'green-600'),
    (r'emerald-400', 'green-400'),
    (r'emerald-', 'green-'),
    (r'rose-500', 'red-600'),
    (r'rose-600', 'red-700'),
    (r'rose-400', 'red-500'),
    (r'rose-', 'red-')
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

print('Theme conversion complete.')
