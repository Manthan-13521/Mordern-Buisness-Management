const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = ['app', 'components'];

const REPLACEMENTS = [
    // Backgrounds & Surfaces
    { regex: /dark:bg-gray-800/g, replacement: "bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg" },
    { regex: /dark:bg-gray-900/g, replacement: "bg-background" },
    { regex: /dark:bg-gray-950/g, replacement: "bg-background" },
    { regex: /bg-gray-900\/5/g, replacement: "bg-black/5" },
    
    // Sidebar / Navbar
    { regex: /bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700/g, replacement: "bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10" },
    { regex: /bg-indigo-600/g, replacement: "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0" },
    { regex: /hover:bg-indigo-50/g, replacement: "hover:bg-blue-50 dark:hover:bg-blue-500/10" },
    { regex: /text-indigo-600/g, replacement: "text-blue-600 dark:text-blue-400" },
    { regex: /text-indigo-500/g, replacement: "text-blue-500" },
    { regex: /ring-indigo-600/g, replacement: "ring-blue-500" },
    { regex: /focus-within:ring-indigo-600/g, replacement: "focus-within:ring-blue-500" },
    { regex: /focus:ring-indigo-600/g, replacement: "focus:ring-blue-500" },
    { regex: /focus-visible:outline-indigo-600/g, replacement: "focus-visible:outline-blue-500" },
    { regex: /text-gray-900 dark:text-white/g, replacement: "text-gray-900 dark:text-white" }, // Keeping text consistent
];

let filesModifiedCount = 0;

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    REPLACEMENTS.forEach(({ regex, replacement }) => {
        content = content.replace(regex, replacement);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Modified: ${filePath}`);
        filesModifiedCount++;
    }
}

DIRECTORIES_TO_SCAN.forEach(dir => {
    const absolutePath = path.join(process.cwd(), dir);
    if (fs.existsSync(absolutePath)) {
        processDirectory(absolutePath);
    }
});

console.log(`\nUI Sync Complete. Total files instantly upgraded: ${filesModifiedCount}`);
