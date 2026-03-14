import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

let client: twilio.Twilio | null = null;
try {
    if (accountSid && authToken && accountSid.startsWith("AC")) {
        client = twilio(accountSid, authToken);
    }
} catch (e) {
    console.warn("Invalid Twilio credentials in environment, running in mock mode.");
}

export async function sendWhatsAppMessage(toPhone: string, message: string): Promise<boolean> {
    if (!client || !twilioNumber) {
        console.warn("Twilio is not configured. Skipping WhatsApp message.");
        console.log(`[DEBUG MOCK] To: ${toPhone} | Message: ${message}`);
        // Simulate success if not configured (useful for dev without credentials)
        return true;
    }

    try {
        // Format phone number to E.164 (e.g., +91XXXXXXXXXX)
        // For WhatsApp, Twilio requires prefix: whatsapp:+91XXXXXXXXXX
        const formattedPhone = toPhone.startsWith("+") ? toPhone : `+91${toPhone}`;

        await client.messages.create({
            body: message,
            from: twilioNumber,
            to: `whatsapp:${formattedPhone}`,
        });

        return true;
    } catch (error) {
        console.error("Twilio WhatsApp Error:", error);
        return false;
    }
}
