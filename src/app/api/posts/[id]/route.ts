import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import { isSameOriginRequest } from "@/lib/csrf"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { displayName: true }
        },
        channel: {
          select: { name: true }
        },
        _count: {
          select: { replies: true }
        }
      }
    })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const attachments = await prisma.attachment.findMany({
      where: { targetType: 'post', targetId: post.id },
    })

    return NextResponse.json({
      ...post,
      attachments: attachments.map(att => ({
        id: att.id,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        url: `/api/uploads/${att.id}`,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  const { id } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  await prisma.post.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
