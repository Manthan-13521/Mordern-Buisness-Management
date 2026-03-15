"use client";

import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { Camera, X, RefreshCw } from "lucide-react";

interface Plan {
    _id: string;
    name: string;
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

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        dob: "",
        planId: "",
        aadharCard: "",
        address: "",
    });

    useEffect(() => {
        if (isOpen) {
            // Fetch plans to populate select dropdown
            fetch("/api/plans")
                .then((res) => res.json())
                .then((data) => setPlans(data))
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

        setLoading(true);
        try {
            const res = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    photoBase64: photoPreview,
                }),
            });

            if (!res.ok) throw new Error("Failed to create member");

            onSuccess();
            onClose();
            setFormData({ name: "", phone: "", dob: "", planId: "", aadharCard: "", address: "" });
            setPhotoPreview(null);
        } catch (error) {
            console.error(error);
            alert("Error adding member");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0">
            <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold dark:text-white">Add New Member</h2>
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
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Date of Birth</label>
                                <input
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Select Plan</label>
                                <select
                                    required
                                    value={formData.planId}
                                    onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                >
                                    <option value="">Choose a plan...</option>
                                    {plans.map((p) => (
                                        <option key={p._id} value={p._id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Aadhar Card</label>
                                <input
                                    type="text"
                                    value={formData.aadharCard}
                                    onChange={(e) => setFormData({ ...formData, aadharCard: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Right Column: Photo Capture */}
                        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-700">
                            {photoPreview ? (
                                <div className="relative">
                                    <img src={photoPreview} alt="Preview" className="h-48 w-48 rounded-full border-4 border-indigo-100 object-cover shadow-sm dark:border-indigo-900" />
                                    <button
                                        type="button"
                                        onClick={() => setPhotoPreview(null)}
                                        className="absolute bottom-0 right-0 rounded-full bg-white p-2 shadow-md hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                                    >
                                        <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            ) : isCapturing ? (
                                <div className="flex flex-col items-center space-y-2">
                                    <div className="overflow-hidden rounded-full h-48 w-48 border-4 border-indigo-100 dark:border-indigo-900">
                                        <Webcam
                                            audio={false}
                                            ref={webcamRef}
                                            screenshotFormat="image/jpeg"
                                            videoConstraints={{ width: 192, height: 192, facingMode: "user" }}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCapture}
                                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                                    >
                                        Capture Photo
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center">
                                    <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                                        <Camera className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Member Photo</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Required for ID Card</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsCapturing(true)}
                                        className="mt-4 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                    >
                                        Open Camera
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Save Member"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
