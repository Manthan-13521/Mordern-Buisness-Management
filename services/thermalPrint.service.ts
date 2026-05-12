/**
 * Thermal Receipt Printing Service (COMPACT VERSION)
 * - Low ink usage
 * - Short height (saves paper)
 * - Stable for all thermal printers
 * - RawBT compatible (Android Bluetooth thermal printing)
 * - Supports 58mm and 80mm paper widths
 */

export type PaperWidth = "58mm" | "80mm";

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

/**
 * Get saved paper width preference. Defaults to 80mm.
 */
export function getSavedPaperWidth(): PaperWidth {
    if (typeof window === "undefined") return "80mm";
    return (localStorage.getItem("thermalPaperWidth") as PaperWidth) || "80mm";
}

/**
 * Save paper width preference.
 */
export function savePaperWidth(width: PaperWidth): void {
    if (typeof window !== "undefined") {
        localStorage.setItem("thermalPaperWidth", width);
    }
}

/* ---------------- HTML BUILDER ---------------- */

function buildReceiptHTML(data: MemberReceiptData, paperWidth?: PaperWidth): string {
    const regDT = fmtDateTime(data.registeredAt);
    const tillDT = fmtDateTime(data.validTill);
    const pw = paperWidth || getSavedPaperWidth();

    const balance = data.balance;
    const balanceLabel = balance > 0 ? "Bal" : balance < 0 ? "Adv" : "Bal";
    const balanceValue = Math.abs(balance);

    // Adapt font size and text limits for paper width
    const fontSize = pw === "58mm" ? "10px" : "11px";
    const smallFont = pw === "58mm" ? "9px" : "10px";
    const nameMax = pw === "58mm" ? 16 : 20;
    const planMax = pw === "58mm" ? 12 : 14;
    const poolMax = pw === "58mm" ? 20 : 26;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Receipt — ${data.memberId}</title>

<style>
* { margin:0; padding:0; box-sizing:border-box; }

@page { size:${pw} auto; margin:0; }

@media print {
    html, body {
        width: ${pw} !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    /* Hide browser chrome for RawBT/mobile */
    @page { margin: 0; }
}

body {
    width:${pw};
    max-width:${pw};
    font-family: 'Courier New', Courier, monospace;
    font-size:${fontSize};
    color:#000;
    background:#fff;
    -webkit-text-size-adjust: none;
    text-size-adjust: none;
    line-height: 1.2;
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
    border-top:1px dashed #000;
    margin:2px 0;
}

.center { text-align:center; }
.bold { font-weight:bold; }
.small { font-size:${smallFont}; }

/* Prevent content cutoff on narrow printers */
.receipt * {
    overflow-wrap: break-word;
    word-break: break-word;
}
</style>
</head>

<body>
<div class="receipt">

    <div class="center bold">${fitText(data.poolName, poolMax)}</div>
    <div class="center small">Receipt</div>

    <div class="hr"></div>

    <div class="center">MID:${data.memberId}</div>

    <div class="hr"></div>

    <div>Name:${fitText(data.name, nameMax)}</div>
    <div>Ph:${data.phone}</div>

    <div class="hr"></div>

    <div class="row">
        <span>Plan</span>
        <span>${fitText(data.planName, planMax)}</span>
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
        <span>Paid</span>
        <span>${formatMoney(data.paidAmount)}</span>
    </div>

    <div class="row">
        <span>${balanceLabel}</span>
        <span>${formatMoney(balanceValue)}</span>
    </div>

    <div class="hr"></div>

    <div class="row small">
        <span>${regDT}</span>
    </div>
    <div class="row small">
        <span>Valid: ${tillDT}</span>
    </div>

    <div class="hr"></div>

    <div class="center small">Thank you</div>

</div>

<script>
window.onload = function () {
    setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 700);
    }, 250);
};
</script>

</body>
</html>`;
}

/* ---------------- TEST RECEIPT DATA ---------------- */

export function getTestReceiptData(poolName?: string): MemberReceiptData {
    return {
        poolName: poolName || "AquaSync Demo Pool",
        memberId: "TEST-001",
        name: "Test Member",
        phone: "9876543210",
        planName: "Monthly Plan",
        planQty: 1,
        planPrice: 500,
        paidAmount: 500,
        balance: 0,
        registeredAt: new Date(),
        validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
}

/* ---------------- PRINT FUNCTION ---------------- */

export function printThermalReceipt(data: MemberReceiptData, paperWidth?: PaperWidth): void {
    if (typeof window === "undefined") return;

    const html = buildReceiptHTML(data, paperWidth);

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