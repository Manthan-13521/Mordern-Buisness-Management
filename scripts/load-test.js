if (process.env.LOAD_TEST === "true") {
    try {
        const url = new URL(req.url, "http://localhost");

        if (url.searchParams.get("test") === "true") {
            return {
                id: "test-user",
                email: "b@1.com",
                role: "admin",
                poolId: "BIZ001", // ✅ YOUR REAL BUSINESS ID
            };
        }
    } catch {
        // ignore
    }
}