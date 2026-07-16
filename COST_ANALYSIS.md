# COST_ANALYSIS.md

## Status: REQUIRES PRODUCTION METRICS

Accurate cost analysis requires production deployment metrics including:
- Actual MongoDB Atlas tier and usage
- Vercel plan and function invocations
- Upstash Redis plan and bandwidth
- Cloudinary storage and CDN bandwidth
- AWS S3 storage class and data transfer
- Twilio message volume (per-message cost)
- Razorpay transaction volume (per-transaction fee)
- Sentry plan and event volume

## Estimated Cost Model (Based on Code Analysis)

### Assumptions (Must Be Validated)
- 1,000 users across 50 tenants
- 500 KB average document size
- 100 images/tenant (500 KB avg)
- 1MB daily backup per tenant
- 50 WhatsApp messages/day
- 500 Razorpay transactions/month
- Vercel Pro plan

### Monthly Estimated Costs (1,000 users / 50 tenants)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| **Vercel Pro** | $20/mo | Serverless functions, 1TB bandwidth |
| **MongoDB Atlas M10** | $60/mo | 2GB storage, dedicated cluster |
| **Upstash Redis** | $10/mo | 100MB cache, 10K commands/day |
| **Upstash QStash** | $5/mo | 10K requests/month |
| **Cloudinary** | $25/mo | 5GB storage, 50GB CDN |
| **AWS S3** | $5/mo | 5GB backups, standard class |
| **Twilio WhatsApp** | $25/mo | 50 msgs/day × $0.005 |
| **Razorpay** | 2%/transaction | ~$100/mo at ₹500K volume |
| **Sentry** | $26/mo | Team plan, 50K events |
| **Nodemailer (SendGrid)** | $0/mo | Free tier (100 emails/day) |
| **Total Estimated** | **~$176/mo** | |

### Scale Estimates

| Users | Tenants | Monthly Cost | Cost/User | Driver |
|-------|---------|-------------|-----------|--------|
| 100 | 5 | ~$75/mo | $0.75 | Vercel Hobby |
| 500 | 25 | ~$120/mo | $0.24 | Atlas M10 |
| 1,000 | 50 | ~$176/mo | $0.18 | Atlas M10 |
| 5,000 | 250 | ~$450/mo | $0.09 | Atlas M20 |
| 10,000 | 500 | ~$800/mo | $0.08 | Atlas M30 |
| 50,000 | 2,500 | ~$3,000/mo | $0.06 | Atlas M60 |
| 100,000 | 5,000 | ~$5,500/mo | $0.06 | Atlas M80 |
| 1,000,000 | 50,000 | REQUIRES ARCHITECTURE CHANGE | — | Need sharding |

### Growth Vectors

| Resource | Annual Growth Driver | Rate |
|----------|---------------------|------|
| Storage | EntryLog (1KB × 500/day/pool) | ~180MB/year/pool |
| Bandwidth | Photo delivery, dashboard load | ~10GB/month/100 users |
| Compute | Cron jobs (21 daily), API calls | Scales with users |
| WhatsApp | Reminders per-member | ~50 msgs/user/year |
| Backup | Daily S3 upload | ~1GB/month/tenant |

REQUIRES PRODUCTION METRICS for accurate per-unit costs.
