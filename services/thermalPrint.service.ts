/**
 * Thermal Receipt Printing Service (COMPACT VERSION)
 * - Low ink usage
 * - Short height (saves paper)
 * - Stable for all thermal printers
 */

export interface MemberReceiptData {
    poolName: string;
    memberId: string;
    name: string;
    age?: number;
    phone: string;
    planName: string;
    planQty: number;
    planPrice: number;
    paidAmount: number;
    balance: number; // +ve = due, -ve = advance
    registeredAt: Date;
    validTill: Date;
}

/* ---------------- UTILITIES ---------------- */

function fmtDateTime(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();

    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;

    return `${day} ${mon} ${yr} ${h}:${m} ${ampm}`;
}

function fitText(text: string, max = 18): string {
    if (!text) return "";
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function formatMoney(n: number): string {
    return `₹${Math.round(n)}`;
}

/* ---------------- HTML BUILDER ---------------- */

function buildReceiptHTML(data: MemberReceiptData): string {
    const regDT = fmtDateTime(data.registeredAt);
    const tillDT = fmtDateTime(data.validTill);

    const balance = data.balance;
    const balanceLabel = balance > 0 ? "Bal" : balance < 0 ? "Adv" : "Bal";
    const balanceValue = Math.abs(balance);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Receipt — ${data.memberId}</title>

<style>
* { margin:0; padding:0; box-sizing:border-box; }

@page { size:80mm auto; margin:0; }

body {
    width:80mm;
    font-family: monospace;
    font-size:11px;
    color:#000;
}

.receipt { padding:3px; }

.row {
    display:flex;
    justify-content:space-between;
    line-height:1.1;
}

.row span:first-child { min-width:50%; }
.row span:last-child { text-align:right; }

.hr {
    border-top:1px solid #000;
    margin:1px 0;
}

.center { text-align:center; }
.bold { font-weight:bold; }
.small { font-size:10px; }

</style>
</head>

<body>
<div class="receipt">

    <div class="center bold">${fitText(data.poolName, 26)}</div>
    <div class="center small">Receipt</div>

    <div class="hr"></div>

    <div class="center">MID:${data.memberId}</div>

    <div class="hr"></div>

    <div>Name:${fitText(data.name, 20)}</div>
    <div>Ph:${data.phone}</div>

    <div class="hr"></div>

    <div class="row">
        <span>Plan</span>
        <span>${fitText(data.planName, 14)}</span>
    </div>

    <div class="row">
        <span>Qty</span>
        <span>${data.planQty}</span>
    </div>

    <div class="hr"></div>

    <div class="row bold">
        <span>Total</span>
        <span>${formatMoney(data.planPrice)}</span>
    </div>

    <div class="row">
        <span>${balanceLabel}</span>
        <span>${formatMoney(balanceValue)}</span>
    </div>

    <div class="hr"></div>

    <div class="row">
        <span>${regDT}</span>
        <span>${tillDT}</span>
    </div>

    <div class="hr"></div>

    <div class="center small">Thank you</div>

</div>

<script>
window.onload = function () {
    setTimeout(() => {
        window.print();
        setTimeout(() => window.close(), 700);
    }, 250);
};
</script>

</body>
</html>`;
}

/* ---------------- PRINT FUNCTION ---------------- */

export function printThermalReceipt(data: MemberReceiptData): void {
    if (typeof window === "undefined") return;

    const html = buildReceiptHTML(data);

    const win = window.open(
        "",
        "_blank",
        "width=320,height=360,toolbar=0,menubar=0,scrollbars=0"
    );

    if (!win) {
        console.warn("[ThermalPrint] Popup blocked.");
        return;
    }

    win.document.write(html);
    win.document.close();
    win.focus();
}