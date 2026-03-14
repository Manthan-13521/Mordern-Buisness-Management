/**
 * Notification routing service for Multi-Tenant Pools
 * Routes messages to appropriate channels (SMS, Email, WhatsApp)
 */

interface SendMessageConfig {
    poolId: string;
    recipient: string; // phone or email
    message: string;
    channel: "sms" | "whatsapp" | "email";
    priority?: "high" | "low";
}

export const NotificationService = {
    async sendMembershipExpiryWarning(poolId: string, phone: string, memberName: string, daysLeft: number) {
        const message = `Hi ${memberName}, your swimming pool membership expires in ${daysLeft} days. Please renew to avoid interruption.`;
        return this.dispatch({ poolId, recipient: phone, message, channel: "whatsapp", priority: "high" });
    },

    async sendPaymentConfirmation(poolId: string, email: string, amount: number, transactionId: string) {
        const message = `Payment of ₹${amount} received successfully. Transaction ID: ${transactionId}. Thank you!`;
        return this.dispatch({ poolId, recipient: email, message, channel: "email" });
    },
    
    async sendRaceSchedules(poolId: string, phone: string, eventName: string, date: string) {
        const message = `Race Alert! ${eventName} is scheduled on ${date}. Confirm your lane assignment in the member portal.`;
        return this.dispatch({ poolId, recipient: phone, message, channel: "sms" });
    },

    async dispatch(config: SendMessageConfig) {
        // Here we would typically check the `Pool` tenant settings to see what channels they have configured
        // (e.g Twilio credentials, SendGrid keys, WhatsApp Business API tokens)
        
        console.log(`[Notification: ${config.channel.toUpperCase()}] Routing to ${config.recipient} for Pool ${config.poolId}`);
        console.log(`Content: ${config.message}`);
        
        // Mock success response
        return { success: true, timestamp: new Date() };
    }
}
