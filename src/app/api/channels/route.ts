import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateTextField } from "@/lib/validate"
import { isSameOriginRequest } from "@/lib/csrf"

export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      include: {
        creator: {
          select: { displayName: true }
        },
        _count: {
          select: { posts: true }
        }
      }
    })
    return NextResponse.json(channels)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
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

  const body = await request.json().catch(() => null)
  const name = body?.name
  const description = body?.description ?? null

  const nameError = validateTextField(name, "Channel name", 50)
  if (nameError) return NextResponse.json({ error: nameError }, { status: 400 })

  const existing = await prisma.channel.findUnique({ where: { name } })
  if (existing) {
    return NextResponse.json({ error: "Channel name is already taken." }, { status: 409 })
  }

  const user = await prisma.user.findUnique({ where: { displayName: session.user.name } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const channel = await prisma.channel.create({
    data: {
      name,
      description,
      createdBy: user.id,
    },
  })

  return NextResponse.json(channel)
}
