"use client";

import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { Camera, X, RefreshCw, Printer, ScanFace } from "lucide-react";
import { useThermalPrint } from "@/components/printing/useThermalPrint";
import { FaceDetector } from "@/components/FaceDetector";

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
    hasFaceScan?: boolean;
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
    const { print: printThermal } = useThermalPrint();

    // Face descriptor from auto-detection
    const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);

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

    const handleCapture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setPhotoPreview(imageSrc);
            setIsCapturing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If plan requires face scan, enforce it
        if (selectedPlan?.hasFaceScan && !faceDescriptor) {
            alert("This plan requires face scan. Please wait for face to be auto-detected.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    phone: formData.phone,
                    planId: formData.planId,
                    planQuantity: Number(formData.planQuantity),
                    paidAmount: formData.paidAmount,
                    balanceAmount: autoBalance,
                    paymentMode: formData.paymentMode,
                    equipmentTaken: formData.equipmentTaken || undefined,
                    photoBase64: photoPreview,
                    faceDescriptor: faceDescriptor || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create member");
            }

            const newMember = await res.json();

            // Auto-print token if plan has hasTokenPrint
            if (selectedPlan?.hasTokenPrint) {
                const planEndDate = newMember.planEndDate
                    ? new Date(newMember.planEndDate)
                    : newMember.expiryDate
                    ? new Date(newMember.expiryDate)
                    : undefined;

                printThermal({
                    poolName:     "Swimming Pool",
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
            setFaceDescriptor(null);
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
            <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900 overflow-y-auto max-h-[90vh]">
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
                                    required type="text" value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Phone Number</label>
                                <input
                                    required type="tel" value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Select Plan</label>
                                <select
                                    required value={formData.planId}
                                    onChange={(e) => {
                                        setFormData({ ...formData, planId: e.target.value, planQuantity: 1, paidAmount: 0 });
                                        setFaceDescriptor(null);
                                    }}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
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
                                        {selectedPlan.hasFaceScan && <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800">📷 Face Scan</span>}
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
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                    />
                                </div>
                            )}

                            {/* Price & Payment */}
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2.5 bg-gray-50/50 dark:bg-gray-800/50">
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
                                            type="number" min="0" value={formData.paidAmount}
                                            onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium dark:text-gray-300">Mode</label>
                                        <select
                                            value={formData.paymentMode}
                                            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
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
                                    type="text" value={formData.equipmentTaken}
                                    onChange={(e) => setFormData({ ...formData, equipmentTaken: e.target.value })}
                                    placeholder="e.g. Goggles, Swimming Cap"
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
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
                                            className="absolute bottom-0 right-0 rounded-full bg-white p-2 shadow-md hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
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
                                            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                                            Capture Photo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-center">
                                        <div className="mb-2 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                                            <Camera className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Member Photo</p>
                                        <button type="button" onClick={() => setIsCapturing(true)}
                                            className="mt-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                                            Open Camera
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Face Scan — auto-detect, shown only if plan requires it */}
                            {selectedPlan?.hasFaceScan && (
                                <div className={`rounded-lg border-2 p-4 ${faceDescriptor ? "border-green-400 bg-green-50/50 dark:border-green-700 dark:bg-green-900/20" : "border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10"}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ScanFace className="h-5 w-5 text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                            {faceDescriptor ? "✅ Face Captured" : "Auto Face Scan"}
                                        </span>
                                    </div>
                                    {faceDescriptor ? (
                                        <div className="text-center space-y-2">
                                            <p className="text-sm text-green-600 dark:text-green-400">Face data captured automatically.</p>
                                            <button
                                                type="button"
                                                onClick={() => setFaceDescriptor(null)}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Re-scan
                                            </button>
                                        </div>
                                    ) : (
                                        <FaceDetector
                                            onFaceDetected={(desc, img) => {
                                                setFaceDescriptor(desc);
                                                if (img) setPhotoPreview(img);
                                            }}
                                            size={180}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                        <button type="button" onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="inline-flex items-center gap-2 justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
                            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                            {loading ? "Saving..." : selectedPlan?.hasTokenPrint ? "Save & Print Token" : "Save Member"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
