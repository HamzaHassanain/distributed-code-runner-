import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth/repository";
import { generateToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import type { AuthResponse, AuthUser } from "@/lib/auth/types";

export async function POST(request: Request): Promise<NextResponse<AuthResponse>> {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const authUser: AuthUser = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isGuest: false,
    };

    return NextResponse.json({
      success: true,
      user: authUser,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
