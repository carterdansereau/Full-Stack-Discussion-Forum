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
  const postId = searchParams.get("postId")
  
  if (!postId && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "postId required" }, { status: 400 })
  }
  
  try {
    const where = postId ? { postId } : {}
    const replies = await prisma.reply.findMany({
      where,
      include: {
        author: {
          select: { displayName: true }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    const replyIds = replies.map(r => r.id)
    const attachments = await prisma.attachment.findMany({
      where: { targetType: "reply", targetId: { in: replyIds } },
    })

    const attachmentsByReply: Record<string, { id: string; mimeType: string; sizeBytes: number; url: string }[]> = {}
    attachments.forEach(att => {
      attachmentsByReply[att.targetId] = attachmentsByReply[att.targetId] ?? []
      attachmentsByReply[att.targetId].push({
        id: att.id,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        url: `/api/uploads/${att.id}`,
      })
    })

    const repliesWithAttachments = replies.map(reply => ({
      ...reply,
      attachments: attachmentsByReply[reply.id] ?? [],
    }))

    return NextResponse.json(repliesWithAttachments)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 })
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
  const rate = checkRateLimit(`reply:${session.user.name}:${ip}`, 30, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many reply attempts, try again later." }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const postId = body?.postId
  const parentReplyId = body?.parentReplyId
  const text = body?.body

  const bodyError = validateTextField(text, "Reply", 3000)
  if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 })
  if (!postId) return NextResponse.json({ error: "Post ID is required." }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { displayName: session.user.name } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const data: any = {
    body: text,
    postId,
    authorId: user.id,
  }
  if (parentReplyId) data.parentReplyId = parentReplyId

  try {
    const reply = await prisma.reply.create({ data })
    return NextResponse.json(reply)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 })
  }
}
