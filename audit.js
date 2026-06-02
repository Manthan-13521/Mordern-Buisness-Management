const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'app', 'api');
const results = {
    pool: [],
    hostel: [],
    business: [],
    twilio: []
};

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (file === 'route.ts' || file === 'route.js') {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('POST')) {
                const route = fullPath.replace(apiPath, '').replace('/route.ts', '').replace('/route.js', '');
                
                if (fullPath.includes('/twilio/') || fullPath.includes('whatsapp')) results.twilio.push(route);
                else if (fullPath.includes('/business/')) results.business.push(route);
                else if (fullPath.includes('/hostel/')) results.hostel.push(route);
                else results.pool.push(route);
            }
        }
    }
}
walkDir(apiPath);
console.log(JSON.stringify(results, null, 2));
