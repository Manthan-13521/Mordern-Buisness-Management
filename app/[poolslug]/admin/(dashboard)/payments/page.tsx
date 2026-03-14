"use client";

import { useState, useEffect } from "react";
import { Download, Plus } from "lucide-react";


interface Payment {
    _id: string;
    memberId: { name: string; memberId: string };
    planId: { name: string };
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    date: string;
    status: string;
    recordedBy: { name: string };
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        memberId: "",
        planId: "",
        amount: 0,
        paymentMethod: "cash",
        transactionId: "",
    });

    const [members, setMembers] = useState<{ _id: string; name: string; memberId: string }[]>([]);
    const [plans, setPlans] = useState<{ _id: string; name: string; price: number }[]>([]);

    const fetchPayments = () => {
        setLoading(true);
        fetch("/api/payments")
            .then((res) => res.json())
            .then((data) => {
                setPayments(data);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPayments();

        // Fetch members and plans for the new payment form
        fetch("/api/members").then(r => r.json()).then(data => setMembers(data));
        fetch("/api/plans").then(r => r.json()).then(data => setPlans(data));
    }, []);

    const handleExport = () => {
        window.location.href = "/api/payments/export";
    };

    const handlePlanChange = (planId: string) => {
        const selectedPlan = plans.find((p) => p._id === planId);
        setFormData({ ...formData, planId, amount: selectedPlan ? selectedPlan.price : 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.paymentMethod === "upi" && !formData.transactionId) {
            alert("UPI requires a Transaction ID");
            return;
        }

        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ memberId: "", planId: "", amount: 0, paymentMethod: "cash", transactionId: "" });
                fetchPayments();
            } else {
                alert("Failed to record payment");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Payments</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        A list of all payments received from members.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                    >
                        <Download className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" />
                        Export Excel
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <Plus className="-ml-0.5 mr-1.5 h-5 w-5" />
                        Record Payment
                    </button>
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg dark:ring-white/10">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Date</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Member</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Method</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-gray-500">Loading...</td></tr>
                                    ) : payments.length === 0 ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-gray-500">No payments found.</td></tr>
                                    ) : (
                                        payments.map((payment) => (
                                            <tr key={payment._id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 dark:text-gray-300 sm:pl-6">
                                                    {new Date(payment.date).toLocaleString()}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    <div className="flex flex-col">
                                                        <span>{payment.memberId?.name || "N/A"}</span>
                                                        <span className="text-xs text-gray-500">{payment.memberId?.memberId}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {payment.planId?.name || "N/A"}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    ₹{payment.amount}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${payment.paymentMethod === "upi" ? "bg-purple-50 text-purple-700 ring-purple-600/20" : "bg-green-50 text-green-700 ring-green-600/20"
                                                        }`}>
                                                        {payment.paymentMethod.toUpperCase()}
                                                    </span>
                                                    {payment.transactionId && (
                                                        <div className="text-xs text-gray-400 mt-1">Tx: {payment.transactionId}</div>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400">
                                                        {payment.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
                        <h2 className="text-xl font-semibold dark:text-white mb-4">Record Payment</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Member</label>
                                <select required value={formData.memberId} onChange={e => setFormData({ ...formData, memberId: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white">
                                    <option value="">Select Member</option>
                                    {members.map(m => <option key={m._id} value={m._id}>{m.name} ({m.memberId})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Plan</label>
                                <select required value={formData.planId} onChange={e => handlePlanChange(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white">
                                    <option value="">Select Plan</option>
                                    {plans.map(p => <option key={p._id} value={p._id}>{p.name} - ₹{p.price}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Amount (₹)</label>
                                    <input required type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Method</label>
                                    <select required value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white">
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                    </select>
                                </div>
                            </div>

                            {formData.paymentMethod === "upi" && (
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Transaction ID</label>
                                    <input required type="text" value={formData.transactionId} onChange={e => setFormData({ ...formData, transactionId: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:text-white" placeholder="e.g. UPI Ref No" />
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm rounded-md border dark:border-gray-700 dark:text-gray-300">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500">Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
