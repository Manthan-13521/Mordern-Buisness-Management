/**
 * Simple script to stop the Next.js dev server.
 * Finds the process running on port 3000 and kills it.
 */
const { execSync } = require("child_process");

function stopServer() {
    try {
        console.log("[Stop Server] Searching for process on port 3000...");
        
        // Find PID of process listening on port 3000
        // -t: terse output (PID only)
        // -i: port
        const pid = execSync("lsof -t -i:3000").toString().trim();

        if (pid) {
            console.log(`[Stop Server] Found PID: ${pid}. Sending SIGTERM...`);
            // Split if multiple PIDs found
            pid.split('\n').forEach(id => {
                process.kill(id, "SIGTERM");
            });
            console.log("✅ Development server stopped.");
        } else {
            console.log("⚠ No server found running on port 3000.");
        }
    } catch (e) {
        if (e.status === 1) {
            console.log("⚠ No process detected on port 3000.");
        } else {
            console.log("❌ Error stopping server:", e.message);
        }
    }
}

stopServer();
