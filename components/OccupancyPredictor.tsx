"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BrainCircuit } from "lucide-react";

export default function OccupancyPredictor({ data = [] }: { data?: any[] }) {
    const chartData = data.length > 0 ? data : [
        { time: "06:00", active: 85, predicted: 80 },
        { time: "09:00", active: 45, predicted: 50 },
        { time: "12:00", active: 30, predicted: 25 },
        { time: "15:00", active: 65, predicted: 70 },
        { time: "18:00", active: 95, predicted: 100 },
        { time: "21:00", active: 20, predicted: 15 },
    ];

    return (
        <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl col-span-1 lg:col-span-2 backdrop-blur-xl">
            <h3 className="text-xs font-bold tracking-widest uppercase text-neutral-400 flex items-center gap-2 mb-8">
                <BrainCircuit className="w-4 h-4 text-purple-400" /> AI Peak Prediction Heatmap
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="time" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
                        <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', border: '1px solid rgba(64, 64, 64, 0.5)', borderRadius: '16px', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                            itemStyle={{ color: '#e5e5e5', fontSize: '13px', fontWeight: 500 }}
                            labelStyle={{ color: '#a3a3a3', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}
                        />
                        <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#171717', strokeWidth: 2, stroke: '#a855f7' }} activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} name="Predicted Peak" />
                        <Line type="monotone" dataKey="active" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 6" dot={false} name="Actual Load" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-neutral-800/50">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-400"><div className="w-3 h-1 rounded-full bg-purple-500"></div> AI Projection</div>
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-400"><div className="w-3 h-1 rounded-full bg-blue-500 border border-dashed border-blue-400"></div> Real-time Track</div>
            </div>
        </div>
    );
}
