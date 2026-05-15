import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateTextField } from "@/lib/validate"
import { checkRateLimit } from "@/lib/rateLimiter"
import { isSameOriginRequest } from "@/lib/csrf"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(request.url)
  const channelId = searchParams.get("channelId")
  
  if (!channelId && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "channelId required" }, { status: 400 })
  }
  
  try {
    const where = channelId ? { channelId } : {}
    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: { displayName: true }
        },
        _count: {
          select: { replies: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(posts)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  const rate = checkRateLimit(`post:${session.user.name}:${ip}`, 15, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many post attempts, try again later." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const title = body?.title
  const text = body?.body
  const channelId = body?.channelId

  const titleError = validateTextField(title, "Title", 150)
  if (titleError) return NextResponse.json({ error: titleError }, { status: 400 })
  const bodyError = validateTextField(text, "Body", 5000)
  if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 })
  if (!channelId) return NextResponse.json({ error: "Channel is required." }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { displayName: session.user.name } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const post = await prisma.post.create({
      data: {
        title,
        body: text,
        channelId,
        authorId: user.id,
      },
    })
    return NextResponse.json(post)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
  }
}
