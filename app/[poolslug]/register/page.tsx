"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Webcam from "react-webcam";
import { Camera, RefreshCw, Upload, CheckCircle2, User, CreditCard, Shield, Phone, FileDigit } from "lucide-react";
import Link from "next/link";
import Script from "next/script";


declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Razorpay: any;
    }
}

export default function PublicRegistration() {
    const params = useParams();
    const poolslug = params.poolslug as string;

    const [step, setStep] = useState(1);
    const [plans, setPlans] = useState<any[]>([]);
    const [poolName, setPoolName] = useState("Pool");
    const [adminPhone, setAdminPhone] = useState("");
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        age: "",
        phone: "",
        address: "",
        aadharCard: "",
        planId: "",
        cartQuantity: 1,
    });

    // Photo state
    const [photoMode, setPhotoMode] = useState<"upload" | "webcam">("upload");
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const webcamRef = useRef<Webcam>(null);

    // Success State
    const [isSuccess, setIsSuccess] = useState(false);
    const [newMemberId, setNewMemberId] = useState("");
    const [newDbId, setNewDbId] = useState("");

    useEffect(() => {
        if (poolslug) {
            fetch(`/api/plans?slug=${poolslug}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.plans) {
                        setPlans(data.plans);
                        setPoolName(data.poolName || "Pool");
                        if (data.adminPhone) setAdminPhone(data.adminPhone);
                    } else if (Array.isArray(data)) {
                        setPlans(data); // Fallback if API hasn't updated yet
                    }
                });
        }
    }, [poolslug]);

    const capturePhoto = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setPhotoBase64(imageSrc);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (!formData.name || !formData.age || !formData.phone) return alert("Please fill up Name, Age, and Phone fields.");
            setStep(2);
        } else if (step === 2) {
            if (!photoBase64) return alert("Please capture or upload a photo");
            if (!formData.planId) return alert("Please select a membership plan");
            startPayment();
        }
    };

    const startPayment = async () => {
        setLoading(true);
        try {
            // 1. Create Razorpay order
            const orderRes = await fetch("/api/razorpay/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: formData.planId, cartQuantity: formData.cartQuantity }),
            });
            const orderData = await orderRes.json();

            if (!orderRes.ok) throw new Error(orderData.error);

            // Selected Plan details for UI
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const plan: any = plans.find((p: any) => p._id === formData.planId);

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock",
                amount: orderData.amount,
                currency: orderData.currency,
                name: `${poolName} Membership`,
                description: `Purchasing ${plan?.name}`,
                order_id: !orderData.isMock ? orderData.id : undefined,
                handler: async function (response: any) {
                    // 2. Verify Payment and Register User
                    const verifyRes = await fetch("/api/razorpay/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id || orderData.id,
                            razorpay_payment_id: response.razorpay_payment_id || `mock_pay_${Date.now()}`,
                            razorpay_signature: response.razorpay_signature || "mock_sig",
                            isMock: orderData.isMock,
                            memberData: {
                                ...formData,
                                photoBase64
                            }
                        }),
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyRes.ok) {
                        setNewMemberId(verifyData.memberId);
                        setNewDbId(verifyData.dbId);
                        setIsSuccess(true);
                    } else {
                        alert(verifyData.error || "Payment verification failed");
                    }
                },
                prefill: {
                    name: formData.name,
                    contact: formData.phone,
                },
                theme: {
                    color: "#4f46e5"
                }
            };

            // Handle Mock override if keys aren't set
            if (orderData.isMock) {
                const totalAmt = formData.cartQuantity ? (plan?.price * formData.cartQuantity) : plan?.price;
                const totalQty = formData.cartQuantity || 1;
                if (confirm(`Test Mode Active! Click OK to simulate a successful ₹${totalAmt} payment for ${plan?.name} x ${totalQty}.`)) {
                    options.handler({ mock: true });
                } else {
                    setLoading(false);
                }
                return;
            }

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                alert(`Payment Failed: ${response.error.description}`);
            });
            rzp1.open();

        } catch (err: any) {
            alert(err.message || "Failed to initialize checkout");
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-xl mx-auto mt-16 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden p-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-2">Registration Complete!</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
                    Welcome aboard. Your official Member ID is <strong className="text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">{newMemberId}</strong>.
                </p>

                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 mb-8 shadow-sm">
                    <p className="text-sm text-indigo-900/70 dark:text-indigo-200/70 mb-5 font-medium">Keep this secure. Download your digital ID card to scan at the terminal.</p>
                    <a
                        href={`/api/members/${newDbId}/pdf`}
                        download
                        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 hover:scale-105 transition-all w-full sm:w-auto ring-1 ring-inset ring-black/10"
                    >
                        Download PDF ID Card
                    </a>
                </div>

                <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    ← Return to Homepage
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto my-12 px-4 sm:px-6 relative z-10">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg blur-[100px] opacity-30 select-none pointer-events-none -z-10 bg-gradient-to-tr from-indigo-500 to-purple-400 rounded-full"></div>

            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden border border-white/50 dark:border-gray-700/50">

                {/* Header Sequence */}
                <div className="px-8 py-8 border-b border-gray-200/50 dark:border-gray-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Join {poolName}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 md:text-lg">Register online and get your digital pass instantly.</p>
                        {adminPhone && (
                            <div className="mt-3 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg w-max border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                                <Phone className="w-4 h-4" />
                                <span className="text-sm font-semibold tracking-wide">Support: {adminPhone}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold shadow-sm ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}>1</div>
                        <div className={`h-1 w-8 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'}`}></div>
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold shadow-sm ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}>2</div>
                    </div>
                </div>

                <div className="p-8 md:p-10">
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <User className="w-4 h-4 text-indigo-500" /> Full Name *
                                    </label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="block w-full rounded-xl border-gray-300 bg-gray-50/50 py-3 px-4 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white transition-all hover:bg-white dark:hover:bg-gray-800" placeholder="e.g. John Doe" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <FileDigit className="w-4 h-4 text-indigo-500" /> Age *
                                    </label>
                                    <input required type="number" min="1" max="120" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className="block w-full rounded-xl border-gray-300 bg-gray-50/50 py-3 px-4 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white transition-all hover:bg-white dark:hover:bg-gray-800" placeholder="25" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-indigo-500" /> Phone Number (WhatsApp) *
                                    </label>
                                    <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="block w-full rounded-xl border-gray-300 bg-gray-50/50 py-3 px-4 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white transition-all hover:bg-white dark:hover:bg-gray-800" placeholder="9876543210" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-indigo-500" /> Aadhar Card (Optional)
                                    </label>
                                    <input type="text" value={formData.aadharCard} onChange={e => setFormData({ ...formData, aadharCard: e.target.value })} className="block w-full rounded-xl border-gray-300 bg-gray-50/50 py-3 px-4 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white transition-all hover:bg-white dark:hover:bg-gray-800" placeholder="1234 5678 9012" />
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Full Address (Optional)</label>
                                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="block w-full rounded-xl border-gray-300 bg-gray-50/50 py-3 px-4 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white transition-all hover:bg-white dark:hover:bg-gray-800" placeholder="123 Pool Street, City" />
                                </div>

                            </div>

                            <div className="mt-8 flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button type="button" onClick={handleNext} className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:-translate-y-0.5 transition-all">
                                    Continue to Plan Selection &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">

                            {/* Photo Section */}
                            <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 md:p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-indigo-500" /> 1. Member Photo Profile
                                </h3>

                                <div className="flex bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm mb-6 max-w-sm mx-auto border border-gray-100 dark:border-gray-800">
                                    <button type="button" onClick={() => setPhotoMode("upload")} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${photoMode === "upload" ? "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}>Upload Image</button>
                                    <button type="button" onClick={() => setPhotoMode("webcam")} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${photoMode === "webcam" ? "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}>Take Photo</button>
                                </div>

                                <div className="flex justify-center rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 bg-white/50 dark:bg-gray-900/50 px-6 py-10 transition-all">
                                    {photoBase64 ? (
                                        <div className="text-center group">
                                            <div className="relative inline-block rounded-full p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl mb-4">
                                                <img src={photoBase64} alt="Captured" className="h-40 w-40 object-cover rounded-full border-4 border-white dark:border-gray-900 bg-white" />
                                            </div>
                                            <button type="button" onClick={() => setPhotoBase64(null)} className="flex items-center justify-center text-sm font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full mx-auto transition-colors">
                                                <RefreshCw className="mr-2 h-4 w-4" /> Retake Photo
                                            </button>
                                        </div>
                                    ) : photoMode === "webcam" ? (
                                        <div className="w-full max-w-sm flex flex-col items-center">
                                            <div className="relative rounded-full overflow-hidden w-48 h-48 mb-6 border-4 border-indigo-100 dark:border-indigo-900/40 shadow-inner bg-black">
                                                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ width: 400, height: 400, facingMode: "user" }} className="w-full h-full object-cover opacity-90" />
                                            </div>
                                            <button type="button" onClick={capturePhoto} className="inline-flex items-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 hover:scale-105 transition-all">
                                                <Camera className="mr-2 h-5 w-5" /> Capture Now
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center w-full">
                                            <div className="mx-auto h-16 w-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                                                <Upload className="h-8 w-8" />
                                            </div>
                                            <div className="flex flex-col text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center items-center space-y-2">
                                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-full bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-md hover:bg-indigo-500 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2">
                                                    <span>Browse Files</span>
                                                    <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleFileUpload} />
                                                </label>
                                                <p className="font-medium text-xs">or drag and drop here</p>
                                            </div>
                                            <p className="text-xs leading-5 text-gray-500 dark:text-gray-500 mt-4">High Quality PNG or JPG</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Plan Selection */}
                            <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 md:p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-indigo-500" /> 2. Select Membership Plan
                                </h3>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {plans.map((plan: any) => (
                                        <div
                                            key={plan._id}
                                            onClick={() => setFormData({ ...formData, planId: plan._id })}
                                            className={`relative flex flex-col cursor-pointer rounded-2xl border-2 p-5 shadow-sm transition-all focus:outline-none ${formData.planId === plan._id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-indigo-100 dark:shadow-none scale-[1.02]' : 'border-transparent bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="block text-lg font-extrabold text-gray-900 dark:text-white capitalize">{plan.name}</span>
                                                <div className={`rounded-full p-1 border-2 ${formData.planId === plan._id ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-gray-300 dark:border-gray-600'}`}>
                                                    <CheckCircle2 className={`h-4 w-4 ${formData.planId === plan._id ? 'text-white' : 'text-transparent'}`} />
                                                </div>
                                            </div>
                                            <div className="mt-auto pt-4 flex flex-col items-start text-sm border-t border-gray-100 dark:border-gray-700/50">
                                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                                    Duration: {
                                                        plan.durationDays ? `${plan.durationDays} Days` :
                                                        plan.durationHours ? `${plan.durationHours} Hours` :
                                                        plan.durationMinutes ? `${plan.durationMinutes} Mins` :
                                                        plan.durationSeconds ? `${plan.durationSeconds} Secs` :
                                                        'N/A'
                                                    }
                                                </span>
                                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">₹{plan.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quantity prompt for selected plan */}
                            {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const selectedPlan = plans.find((p: any) => p._id === formData.planId) as any;
                                if (selectedPlan?.allowQuantity) {
                                    return (
                                        <div className="flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4">
                                            <div className="p-6 bg-indigo-50/80 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                                                <label className="text-sm font-semibold text-indigo-950 dark:text-indigo-100 block mb-4 text-center">Number of Memberships</label>
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-700 overflow-hidden">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, cartQuantity: Math.max(1, (formData.cartQuantity || 1) - 1) })}
                                                            className="px-4 py-3 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-gray-700 font-bold text-lg transition-colors"
                                                        >-</button>
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            max="25"
                                                            value={formData.cartQuantity || 1}
                                                            onChange={(e) => {
                                                                let val = parseInt(e.target.value) || 1;
                                                                if (val > 25) val = 25;
                                                                if (val < 1) val = 1;
                                                                setFormData({ ...formData, cartQuantity: val });
                                                            }}
                                                            className="w-16 text-center py-3 border-none font-bold text-gray-900 dark:text-white bg-transparent focus:ring-0"
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, cartQuantity: Math.min(25, (formData.cartQuantity || 1) + 1) })}
                                                            className="px-4 py-3 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-gray-700 font-bold text-lg transition-colors"
                                                        >+</button>
                                                    </div>
                                                    <div className="text-center w-full pt-3 border-t border-indigo-100/50 dark:border-gray-700">
                                                        <span className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-medium uppercase tracking-wider block mb-1">Total Payment</span>
                                                        <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                                            ₹{selectedPlan.price * (formData.cartQuantity || 1)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <div className="flex flex-col-reverse sm:flex-row justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-8 gap-4">
                                <button type="button" onClick={() => setStep(1)} className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white w-full sm:w-auto text-center sm:text-left py-2">
                                    &larr; Back to Details
                                </button>

                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={loading}
                                    className="w-full sm:w-auto overflow-hidden relative rounded-xl bg-gray-900 dark:bg-indigo-600 px-10 py-4 text-sm font-bold text-white shadow-xl hover:bg-gray-800 dark:hover:bg-indigo-500 disabled:opacity-70 transition-all flex items-center justify-center group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                    <span className="relative flex items-center gap-2">
                                        {loading && <svg className="animate-spin -ml-1 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                        Complete Payment &rarr;
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
