const BASE_URL = "https://modern-businesses-management.vercel.app";

// 🔥 Use REAL users from your system
const USERS = [
    { email: "email-test@1.com" },     // pool
    { email: "email-h@1.com" },        // hostel
    { email: "email-b@1.com" },        // business
];

const TEST_SECRET = "manthan_test_123"; // must match your .env

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function simulateUser(user, index) {
    try {
        console.log(`\n👤 User ${index + 1} started`);

        // 🔐 LOGIN (via test-login with secret)
        const loginRes = await fetch(`${BASE_URL}/api/test-login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-test-secret": TEST_SECRET,
            },
            body: JSON.stringify({ email: user.email }),
        });

        const loginData = await loginRes.json();

        if (!loginData.token) {
            throw new Error(JSON.stringify(loginData));
        }

        const token = loginData.token;

        const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        console.log(`✅ Logged in`);

        // ================= POOL =================
        await fetch(`${BASE_URL}/api/members`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                name: `User_${index}`,
                plan: "monthly",
                amount: 1000,
            }),
        });

        console.log("🏊 Member added");

        await fetch(`${BASE_URL}/api/members`, { headers });
        console.log("📄 Members fetched");

        // ================= HOSTEL =================
        const studentRes = await fetch(`${BASE_URL}/api/hostel/students`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                name: `Student_${index}`,
                rent: 5000,
            }),
        });

        const studentData = await studentRes.json();

        if (studentData?._id) {
            await fetch(`${BASE_URL}/api/hostel/assign-room`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    studentId: studentData._id,
                    roomNumber: index + 1,
                }),
            });
        }

        console.log("🏨 Hostel flow done");

        // ================= BUSINESS =================
        await fetch(`${BASE_URL}/api/business/dashboard`, { headers });

        console.log("🏢 Business checked");

        await delay(Math.random() * 1000);

        console.log(`🚪 User ${index + 1} done`);

    } catch (err) {
        console.error(`❌ User ${index + 1} error:`, err.message);
    }
}

async function runTest() {
    console.log("🔥 VERCEL SAAS TEST STARTED");

    await Promise.all(USERS.map(simulateUser));

    console.log("\n🏁 TEST COMPLETE");
}

runTest();