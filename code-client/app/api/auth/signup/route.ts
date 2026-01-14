import { NextResponse } from "next/server";
import { createUser } from "@/lib/auth/repository";
import { generateToken } from "@/lib/auth/jwt";
import { validateEmail, validatePasswordStrength } from "@/lib/auth/password";
import type { AuthResponse, AuthUser } from "@/lib/auth/types";

export async function POST(request: Request): Promise<NextResponse<AuthResponse>> {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ success: false, error: emailError }, { status: 400 });
    }

    // Validate password strength
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ success: false, error: passwordError }, { status: 400 });
    }

    // Validate name
    if (name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(email, password, name.trim());

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
    const message = error instanceof Error ? error.message : "Failed to create account";

    // Check for duplicate email
    if (message.includes("already exists")) {
      return NextResponse.json({ success: false, error: message }, { status: 409 });
    }

    console.error("Signup error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
