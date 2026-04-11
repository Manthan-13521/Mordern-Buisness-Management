const fs = require('fs');
const path = require('path');

const targetDirs = [
    '/Users/manthanjaiswal/swimming-pool-system/components/business',
    '/Users/manthanjaiswal/swimming-pool-system/app/business/[businessSlug]/admin'
];

const matchRules = [
    { regex: /bg-\[\#1e293b\]/g, replace: 'bg-black' },
    { regex: /bg-\[\#0f172a\]/g, replace: 'bg-black' },
    { regex: /indigo-600/g, replace: 'purple-600' },
    { regex: /indigo-500/g, replace: 'purple-600' }, // using 600 often for background covers better for purple
    { regex: /indigo-400/g, replace: 'purple-400' },
    { regex: /bg-slate-900\/50/g, replace: 'bg-[#111] border-white/5' },
    { regex: /bg-slate-900/g, replace: 'bg-black' },
    { regex: /bg-slate-800/g, replace: 'bg-[#111]' },
    { regex: /text-slate-900 dark:text-white/g, replace: 'text-white' }, // Force dark mode text globally where these toggles exist
    { regex: /bg-white dark:bg-black/g, replace: 'bg-black' }, // Force dark
    { regex: /emerald-500/g, replace: 'green-500' },
    { regex: /emerald-600/g, replace: 'green-600' },
    { regex: /emerald-400/g, replace: 'green-400' },
    { regex: /emerald-/g, replace: 'green-' },
    { regex: /rose-500/g, replace: 'red-600' },
    { regex: /rose-600/g, replace: 'red-700' },
    { regex: /rose-400/g, replace: 'red-500' },
    { regex: /rose-/g, replace: 'red-' }
];

function processDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            matchRules.forEach(rule => {
                if (rule.regex.test(content)) {
                    content = content.replace(rule.regex, rule.replace);
                    modified = true;
                }
            });
            
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

targetDirs.forEach(dir => processDirectory(dir));
console.log('Theme conversion complete.');
