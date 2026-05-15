import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetType = searchParams.get("targetType")
  const targetId = searchParams.get("targetId")

  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 })
  }

  const attachments = await prisma.attachment.findMany({
    where: { targetType, targetId },
  })

  return NextResponse.json(
    attachments.map(att => ({
      id: att.id,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      url: `/api/uploads/${att.id}`,
    })),
  )
}
