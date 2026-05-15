import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const query = searchParams.get("q") ?? ""
    const limit = Number(searchParams.get("limit") ?? "20")
    const offset = Number(searchParams.get("offset") ?? "0")

    if (!type) {
      return NextResponse.json({ error: "type required" }, { status: 400 })
    }

    switch (type) {
      case "posts": {
        const where = {
          OR: [
            { title: { contains: query } },
            { body: { contains: query } },
          ],
        }
        const total = await prisma.post.count({ where })
        const posts = await prisma.post.findMany({
          where,
          include: {
            author: { select: { displayName: true } },
            channel: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        })
        return NextResponse.json({ results: posts, total, offset, limit, hasMore: offset + posts.length < total })
      }

      case "replies": {
        const where = { body: { contains: query } }
        const total = await prisma.reply.count({ where })
        const replies = await prisma.reply.findMany({
          where,
          include: {
            author: { select: { displayName: true } },
            post: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        })
        return NextResponse.json({ results: replies, total, offset, limit, hasMore: offset + replies.length < total })
      }

      case "author": {
        const user = await prisma.user.findUnique({ where: { displayName: query } })
        if (!user) return NextResponse.json({ user: null, posts: [], replies: [] })

        const posts = await prisma.post.findMany({
          where: { authorId: user.id },
          include: {
            author: { select: { displayName: true } },
            channel: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        })
        const replies = await prisma.reply.findMany({
          where: { authorId: user.id },
          include: {
            author: { select: { displayName: true } },
            post: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        })

        return NextResponse.json({ user: { id: user.id, displayName: user.displayName }, posts, replies })
      }

      case "top-user": {
        const groups = await prisma.post.groupBy({
          by: ["authorId"],
          _count: { _all: true },
        })
        const sorted = groups.sort((a, b) => b._count._all - a._count._all)
        const top = sorted[0]
        if (!top) return NextResponse.json({ user: null, postCount: 0 })
        const user = await prisma.user.findUnique({ where: { id: top.authorId } })
        return NextResponse.json({ user, postCount: top._count._all })
      }

      case "bottom-user": {
        const groups = await prisma.post.groupBy({
          by: ["authorId"],
          _count: { _all: true },
        })
        const sorted = groups.sort((a, b) => a._count._all - b._count._all)
        const bottom = sorted[0]
        if (!bottom) return NextResponse.json({ user: null, postCount: 0 })
        const user = await prisma.user.findUnique({ where: { id: bottom.authorId } })
        return NextResponse.json({ user, postCount: bottom._count._all })
      }

      case "top-content": {
        const groups = await prisma.vote.groupBy({
          by: ["targetType", "targetId"],
          _sum: { value: true },
          orderBy: { _sum: { value: "desc" } },
          where: { targetType: { in: ["post", "reply"] } },
          take: 1,
        })
        const top = groups[0]
        if (!top) return NextResponse.json({ top: null })

        const content =
          top.targetType === "post"
            ? await prisma.post.findUnique({
                where: { id: top.targetId },
                include: {
                  author: { select: { displayName: true } },
                  channel: { select: { name: true } },
                },
              })
            : await prisma.reply.findUnique({
                where: { id: top.targetId },
                include: {
                  author: { select: { displayName: true } },
                  post: { select: { id: true, title: true } },
                },
              })

        return NextResponse.json({ top: { ...top, content } })
      }

      case "bottom-content": {
        const groups = await prisma.vote.groupBy({
          by: ["targetType", "targetId"],
          _sum: { value: true },
          orderBy: { _sum: { value: "asc" } },
          where: { targetType: { in: ["post", "reply"] } },
          take: 1,
        })
        const bottom = groups[0]
        if (!bottom) return NextResponse.json({ bottom: null })

        const content =
          bottom.targetType === "post"
            ? await prisma.post.findUnique({
                where: { id: bottom.targetId },
                include: {
                  author: { select: { displayName: true } },
                  channel: { select: { name: true } },
                },
              })
            : await prisma.reply.findUnique({
                where: { id: bottom.targetId },
                include: {
                  author: { select: { displayName: true } },
                  post: { select: { id: true, title: true } },
                },
              })

        return NextResponse.json({ bottom: { ...bottom, content } })
      }

      default:
        return NextResponse.json({ error: "Unknown search type" }, { status: 400 })
    }
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}