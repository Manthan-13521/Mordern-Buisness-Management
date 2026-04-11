const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Use fs if glob isn't present, but let's try manual traversal

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const dirs = [
    './app/api/cron',
    './app/api/jobs'
];

dirs.forEach(dir => {
    walkDir(dir, function(filePath) {
        if (!filePath.endsWith('route.ts')) return;
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Skip if already secured or uses requireCronAuth
        if (content.includes('requireCronAuth') || content.includes('CRON_SECRET')) {
            // Already has some form of check, but let's see if we should enforce it
            // Cleanup route already had CRON_SECRET, so skip it for now.
            return;
        }

        // Add import if not present
        if (!content.includes('requireCronAuth')) {
            content = `import { requireCronAuth } from "@/lib/requireCronAuth";\n` + content;
        }

        // Inject the check at the top of GET or POST
        content = content.replace(/export\s+async\s+function\s+(GET|POST)\s*\(\s*req([^)]*)\)\s*\{/, 
            (match) => `${match}\n    const authError = requireCronAuth(req);\n    if (authError) return authError;\n`
        );

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Secured ${filePath}`);
    });
});
