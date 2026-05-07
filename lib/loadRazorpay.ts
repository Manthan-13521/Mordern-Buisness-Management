export async function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
        // Handle SSR
        if (typeof window === "undefined") {
            return resolve(false);
        }

        // Check if already loaded
        if (window.Razorpay) {
            return resolve(true);
        }

        // Prevent duplicate script injections
        if (document.getElementById("razorpay-checkout-js")) {
            // Script tag exists but window.Razorpay might not be ready yet
            // Wait a bit or assume it's loading
            let retries = 0;
            const interval = setInterval(() => {
                if (window.Razorpay) {
                    clearInterval(interval);
                    resolve(true);
                }
                if (retries > 20) { // 2 seconds max
                    clearInterval(interval);
                    resolve(false);
                }
                retries++;
            }, 100);
            return;
        }

        console.log("[Razorpay] Injecting checkout.js script...");
        const script = document.createElement("script");
        script.id = "razorpay-checkout-js";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;

        // Timeout fallback
        const timeout = setTimeout(() => {
            console.error("[Razorpay] Script loading timed out.");
            script.onerror = null;
            script.onload = null;
            resolve(false);
        }, 10000); // 10 seconds timeout

        script.onload = () => {
            clearTimeout(timeout);
            console.log("[Razorpay] Script loaded successfully.");
            resolve(true);
        };

        script.onerror = () => {
            clearTimeout(timeout);
            console.error("[Razorpay] Failed to load script.");
            resolve(false);
        };

        document.body.appendChild(script);
    });
}
