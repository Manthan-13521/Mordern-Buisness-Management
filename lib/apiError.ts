import { NextResponse } from "next/server";

export function apiError(error: unknown, status = 500): NextResponse {
    console.error(`[API Error]`, error);

    const isProduction = process.env.NODE_ENV === "production";
    let message = "An unexpected error occurred.";

    if (error instanceof Error) {
        message = isProduction ? "Internal Server Error" : error.message;
        
        // Zod validation errors
        if (error.name === "ZodError" || message.includes("validation")) {
            status = 400;
            message = isProduction ? "Validation Error" : error.message;
        }
    } else if (typeof error === "string") {
        message = isProduction ? "Internal Server Error" : error;
    }

    return NextResponse.json(
        { 
            error: message, 
            ...(isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }) 
        }, 
        { status }
    );
}
