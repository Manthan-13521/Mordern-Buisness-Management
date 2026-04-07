const fs = require('fs');
const path = require('path');

const targets = [
    '/Users/manthanjaiswal/swimming-pool-system/app/api/hostel/logs/route.ts',
    '/Users/manthanjaiswal/swimming-pool-system/app/api/hostel/members/route.ts',
    '/Users/manthanjaiswal/swimming-pool-system/app/api/hostel/members/balance/route.ts',
    '/Users/manthanjaiswal/swimming-pool-system/app/api/hostel/members/expired/route.ts',
    '/Users/manthanjaiswal/swimming-pool-system/app/api/hostel/payments/route.ts',
    '/Users/manthanjaiswal/swimming-pool-system/app/hostel/[hostelSlug]/admin/(dashboard)/expired-members/page.tsx',
    '/Users/manthanjaiswal/swimming-pool-system/app/hostel/[hostelSlug]/admin/(dashboard)/members/page.tsx',
    '/Users/manthanjaiswal/swimming-pool-system/app/hostel/[hostelSlug]/admin/(dashboard)/balance-payments/page.tsx',
    '/Users/manthanjaiswal/swimming-pool-system/app/hostel/[hostelSlug]/admin/(dashboard)/payments/page.tsx'
];

targets.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/const limit = (10|11);/g, 'const limit = 20;');
        fs.writeFileSync(file, content);
        console.log(`Updated limit to 20 in ${file}`);
    } else {
        console.warn(`File not found: ${file}`);
    }
});
