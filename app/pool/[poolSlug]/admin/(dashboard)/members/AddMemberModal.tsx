"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Webcam from "react-webcam";
import { Camera, X, RefreshCw, Printer, ScanFace } from "lucide-react";
import { useThermalPrint } from "@/components/printing/useThermalPrint";
import { addMemberLocal, replaceTempMemberLocal } from "@/lib/local-db/members.repo";

interface Plan {
    _id: string;
    name: string;
    price: number;
    durationDays?: number;
    durationHours?: number;
    durationMinutes?: number;
    durationSeconds?: number;
    hasTokenPrint?: boolean;
    hasEntertainment?: boolean;
    allowQuantity?: boolean;
}

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddMemberModal({ isOpen, onClose, onSuccess }: AddMemberModalProps) {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const webcamRef = useRef<Webcam>(null);
    const { data: session } = useSession();
    const { print: printThermal } = useThermalPrint();

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        planId: "",
        planQuantity: 1,
        paidAmount: 0,
        paymentMode: "cash",
        equipmentTaken: "",
    });

    const selectedPlan = plans.find((p) => p._id === formData.planId) ?? null;

    // Total price = qty × plan price
    const totalPrice = selectedPlan ? selectedPlan.price * formData.planQuantity : 0;
    const autoBalance = Math.max(0, totalPrice - formData.paidAmount);

    useEffect(() => {
        if (isOpen) {
            fetch("/api/plans?limit=100")
                .then((res) => res.json())
                .then((data) => {
                    const planList = Array.isArray(data) ? data : (data.data ?? []);
                    setPlans(planList);
                })
                .catch((err) => console.error("Failed to fetch plans", err));
        }
    }, [isOpen]);

    // Stop webcam stream on unmount to prevent camera leak
    useEffect(() => {
        return () => {
            const stream = webcamRef.current?.video?.srcObject as MediaStream | null;
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const handleCapture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setPhotoPreview(imageSrc);
            setIsCapturing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        try {
            const memberPayload = {
                name: formData.name,
                phone: formData.phone,
                planId: formData.planId,
                planQuantity: Number(formData.planQuantity),
                paidAmount: formData.paidAmount,
                balanceAmount: autoBalance,
                paymentMode: formData.paymentMode,
                equipmentTaken: formData.equipmentTaken || undefined,
                photoBase64: photoPreview,
            };

            // --- STEP 4: OFFLINE WRITE ---
            const tempId = `temp_${Date.now()}`;
            if (session?.user?.poolId) {
                try {
                    await addMemberLocal({
                        ...memberPayload,
                        id: tempId,
                        clientId: tempId,
                        poolId: session.user.poolId,
                        type: "member", // Default since UI doesn't expose it
                        status: "ACTIVE",
                        updatedAt: Date.now(),
                        synced: false
                    });
                } catch (e) {
                    console.error("Offline write failed", e);
                }
            }
            // -----------------------------

            const res = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...memberPayload, clientId: tempId }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create member");
            }

            const newMember = await res.json();

            // --- STEP 4: SYNC TEMPORARY ID TO SERVER DATA ---
            if (session?.user?.poolId) {
                try {
                    await replaceTempMemberLocal(tempId, {
                        ...newMember,
                        poolId: session.user.poolId,
                        type: newMember._source || "member",
                        status: newMember.verdict || "ACTIVE",
                        updatedAt: newMember.updatedAt || Date.now(),
                    });
                } catch (e) {
                    console.error("Failed to replace temp offline record", e);
                }
            }
            // ------------------------------------------------

            // Auto-print token if plan has hasTokenPrint
            if (selectedPlan?.hasTokenPrint) {
                const planEndDate = newMember.planEndDate
                    ? new Date(newMember.planEndDate)
                    : newMember.expiryDate
                    ? new Date(newMember.expiryDate)
                    : undefined;

                printThermal({
                    poolName:     session?.user?.poolName || "Swimming Pool",
                    memberId:     newMember.memberId,
                    name:         newMember.name,
                    phone:        newMember.phone,
                    planName:     selectedPlan.name,
                    planQty:      formData.planQuantity,
                    planPrice:    totalPrice,
                    paidAmount:   newMember.paidAmount  ?? 0,
                    balance:      newMember.balanceAmount ?? 0,
                    registeredAt: new Date(newMember.createdAt ?? Date.now()),
                    validTill:    planEndDate ?? new Date(),
                });
            }

            // Reset and close
            onSuccess();
            onClose();
            setFormData({ name: "", phone: "", planId: "", planQuantity: 1, paidAmount: 0, paymentMode: "cash", equipmentTaken: "" });
            setPhotoPreview(null);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Error adding member");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0">
            <div className="relative w-full max-w-2xl rounded-xl bg-background p-6 shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold dark:text-white">Add New Member</h2>
                        {selectedPlan?.hasTokenPrint && (
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400">
                                <Printer className="h-3.5 w-3.5" />
                                Token receipt will print automatically on save
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="h-5 w-5 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {/* Left Column: Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Full Name</label>
                                <input
                                    required type="text" value={formData.name} maxLength={30}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Phone Number</label>
                                <input
                                    required type="tel" value={formData.phone} minLength={10} maxLength={13}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Select Plan</label>
                                <select
                                    required value={formData.planId}
                                    onChange={(e) => {
                                        setFormData({ ...formData, planId: e.target.value, planQuantity: 1, paidAmount: 0 });
                                    }}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-white sm:text-sm"
                                >
                                    <option value="">Choose a plan...</option>
                                    {plans.map((p) => (
                                        <option key={p._id} value={p._id}>{p.name} — ₹{p.price}</option>
                                    ))}
                                </select>
                                {selectedPlan && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        {selectedPlan.hasTokenPrint && <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700 ring-1 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:ring-teal-800">🖨️ Token</span>}
                                        {selectedPlan.hasEntertainment && <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-800">🎭 Entertainment</span>}
                                        {selectedPlan.allowQuantity && <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-800">🔢 Multi-Qty</span>}
                                    </div>
                                )}
                            </div>

                            {/* Quantity — only shown if plan.allowQuantity */}
                            {selectedPlan?.allowQuantity && (
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">
                                        Quantity <span className="text-gray-400">(max 25)</span>
                                    </label>
                                    <input
                                        type="number" min="1" max="25" value={formData.planQuantity}
                                        onChange={(e) => setFormData({ ...formData, planQuantity: Number(e.target.value) })}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-white sm:text-sm"
                                    />
                                </div>
                            )}

                            {/* Price & Payment */}
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2.5 bg-gray-50/50 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        Total {formData.planQuantity > 1 && `(₹${selectedPlan?.price} × ${formData.planQuantity})`}
                                    </span>
                                    <span className="font-semibold dark:text-white">₹{totalPrice}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium dark:text-gray-300">Paid (₹)</label>
                                        <input
                                            type="number" min="0" max="999999" step="1"
                                            value={formData.paidAmount}
                                            onChange={(e) => {
                                                const val = Math.min(999999, Math.max(0, Number(e.target.value)));
                                                if (Number.isFinite(val)) setFormData({ ...formData, paidAmount: val });
                                            }}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-white sm:text-sm"
                                            placeholder="Max ₹9,99,999"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium dark:text-gray-300">Mode</label>
                                        <select
                                            value={formData.paymentMode}
                                            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-white sm:text-sm"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="upi">UPI</option>
                                            <option value="card">Card</option>
                                            <option value="online">Online</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm pt-1 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-gray-500 dark:text-gray-400">Balance</span>
                                    <span className={`font-semibold ${autoBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                                        ₹{autoBalance}
                                    </span>
                                </div>
                            </div>

                            {/* Equipment */}
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Equipment Taken <span className="text-gray-400 text-xs">(optional)</span></label>
                                <input
                                    type="text" value={formData.equipmentTaken} maxLength={200}
                                    onChange={(e) => setFormData({ ...formData, equipmentTaken: e.target.value })}
                                    placeholder="e.g. Goggles, Swimming Cap"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-white sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Right Column: Photo + Face Scan */}
                        <div className="space-y-4">
                            {/* Photo Capture */}
                            <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-700">
                                {photoPreview ? (
                                    <div className="relative">
                                        <img src={photoPreview} alt="Preview" className="h-36 w-36 rounded-full border-4 border-indigo-100 object-cover shadow-sm dark:border-indigo-900" />
                                        <button
                                            type="button" onClick={() => setPhotoPreview(null)}
                                            className="absolute bottom-0 right-0 rounded-full bg-white p-2 shadow-md hover:bg-gray-50 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:hover:bg-gray-700"
                                        >
                                            <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                        </button>
                                    </div>
                                ) : isCapturing ? (
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className="overflow-hidden rounded-full h-36 w-36 border-4 border-indigo-100 dark:border-indigo-900">
                                            <Webcam
                                                audio={false} ref={webcamRef} screenshotFormat="image/jpeg"
                                                videoConstraints={{ width: 192, height: 192, facingMode: "user" }}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <button type="button" onClick={handleCapture}
                                            className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-medium text-white hover:bg-blue-50 dark:hover:bg-blue-500/100">
                                            Capture Photo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-center">
                                        <div className="mb-2 rounded-full bg-gray-100 p-3 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg">
                                            <Camera className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Member Photo</p>
                                        <button type="button" onClick={() => setIsCapturing(true)}
                                            className="mt-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-gray-200 dark:hover:bg-gray-700">
                                            Open Camera
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                        <button type="button" onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg dark:text-gray-300 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="inline-flex items-center gap-2 justify-center rounded-md border border-transparent bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
                            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                            {loading ? "Saving..." : selectedPlan?.hasTokenPrint ? "Save & Print Token" : "Save Member"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
