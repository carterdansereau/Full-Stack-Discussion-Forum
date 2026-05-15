import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOriginRequest } from "@/lib/csrf"

const allowedTargets = ["post", "reply"]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetType = searchParams.get("targetType")
  const targetId = searchParams.get("targetId")

  if (!targetType || !allowedTargets.includes(targetType)) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 })
  }
  if (!targetId) {
    return NextResponse.json({ error: "targetId required" }, { status: 400 })
  }

  const score = await prisma.vote.aggregate({
    where: { targetType, targetId },
    _sum: { value: true },
  })

  const session = await getServerSession(authOptions)
  let userVote = 0
  if (session?.user?.name) {
    const user = await prisma.user.findUnique({ where: { displayName: session.user.name } })
    if (user) {
      const vote = await prisma.vote.findUnique({
        where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } },
      })
      userVote = vote?.value ?? 0
    }
  }

  return NextResponse.json({ score: score._sum.value ?? 0, userVote })
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const targetType = body?.targetType
  const targetId = body?.targetId
  const value = Number(body?.value)

  if (!targetType || !allowedTargets.includes(targetType)) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 })
  }
  if (!targetId) {
    return NextResponse.json({ error: "targetId required" }, { status: 400 })
  }
  if (![1, -1, 0].includes(value)) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { displayName: session.user.name } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (value === 0) {
    await prisma.vote.deleteMany({ where: { userId: user.id, targetType, targetId } })
    return NextResponse.json({ success: true })
  }

  await prisma.vote.upsert({
    where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } },
    create: { userId: user.id, targetType, targetId, value },
    update: { value },
  })

  return NextResponse.json({ success: true })
}
