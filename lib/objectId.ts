import mongoose from "mongoose";

export function isValidObjectId(id: any): boolean {
    if (!id) return false;
    if (typeof id !== "string" && typeof id !== "object") return false;
    return mongoose.Types.ObjectId.isValid(id) && (String(new mongoose.Types.ObjectId(id)) === String(id));
}

export function areValidObjectIds(ids: any[]): boolean {
    if (!Array.isArray(ids)) return false;
    return ids.every(isValidObjectId);
}
