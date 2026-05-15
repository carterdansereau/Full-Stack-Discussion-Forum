import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { join } from "path"
import { existsSync, readFileSync } from "fs"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const attachment = await prisma.attachment.findUnique({ where: { id } })
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const filePath = join(process.cwd(), "uploads", attachment.storageRef)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File missing" }, { status: 410 })
  }

  const data = readFileSync(filePath)
  return new NextResponse(data, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.sizeBytes),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
