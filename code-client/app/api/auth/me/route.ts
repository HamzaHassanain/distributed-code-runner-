import { NextResponse } from "next/server";
import { verifyToken, extractBearerToken } from "@/lib/auth/jwt";
import type { AuthResponse, AuthUser } from "@/lib/auth/types";

export async function GET(
  request: Request,
): Promise<NextResponse<AuthResponse>> {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 },
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const authUser: AuthUser = {
      _id: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      isGuest: false,
    };

    return NextResponse.json({
      success: true,
      user: authUser,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify authentication" },
      { status: 500 },
    );
  }
}
