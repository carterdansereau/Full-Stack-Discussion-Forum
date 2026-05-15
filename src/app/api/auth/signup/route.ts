import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { validateDisplayName, validatePassword } from "@/lib/validate"
import { checkRateLimit } from "@/lib/rateLimiter"

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    const rate = checkRateLimit(`signup:${ip}`, 5, 60_000)
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many signup attempts, try again later." }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const displayName = body?.displayName
    const password = body?.password

    const nameError = validateDisplayName(displayName)
    if (nameError) return NextResponse.json({ error: nameError }, { status: 400 })
    const passwordError = validatePassword(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { displayName } })
    if (existing) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { displayName, passwordHash, role: "user" },
    })

    return NextResponse.json({ id: user.id, displayName: user.displayName })
  } catch (error) {
    // Ensure we always return JSON so the frontend can parse the response.
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
