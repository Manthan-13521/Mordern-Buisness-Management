const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.next') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = [...walk('app/hostel'), ...walk('app/pool'), ...walk('app/(dashboard)')];
let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Regular expression to match fetch calls that only have 1 argument (the URL)
    // Examples: fetch(url) or fetch(`/api/something`) or fetch( `/api/..` )
    // We only replace if there isn't a second argument present or if it lacks cache: "no-store"
    // To be extremely safe, we'll look for:
    // fetch(URL) => fetch(URL, { cache: "no-store" })
    
    let original = content;

    // Pattern for single-argument fetch calls
    // fetch( something ) -> fetch( something , { cache: "no-store" })
    content = content.replace(/\bfetch\s*\(\s*([^,]+?)\s*\)/g, (match, p1) => {
        // if p1 contains '{' it means it's likely heavily nested or already an object
        if (p1.includes('{') || p1.includes('}')) return match; 
        return `fetch(${p1}, { cache: "no-store" })`;
    });

    // Pattern for two-argument fetch calls without cache rule
    // fetch( url, { method: "GET" }) -> we skip for now to avoid regex mess, but we can do a generic one:
    content = content.replace(/\bfetch\s*\(\s*([^,]+?)\s*,\s*\{\s*([^}]+)\}\s*\)/g, (match, p1, p2) => {
        if (!p2.includes('cache:') && !p2.includes('method: "POST"') && !p2.includes("method: 'POST'") && !p2.includes('method: "PUT"')) {
            if (p2.trim() === '') return `fetch(${p1}, { cache: "no-store" })`;
            return `fetch(${p1}, { cache: "no-store", ${p2.trim()} })`;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Modified: ${file}`);
    }
});

console.log(`Fixed fetch in ${modifiedCount} files.`);
