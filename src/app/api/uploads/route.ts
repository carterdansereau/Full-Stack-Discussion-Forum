import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOriginRequest } from "@/lib/csrf"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join, extname } from "path"

const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/webp"]
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const fileName = body?.fileName
  const mimeType = body?.mimeType
  const base64 = body?.data
  const targetType = body?.targetType
  const targetId = body?.targetId

  if (!fileName || !mimeType || !base64) {
    return NextResponse.json({ error: "fileName, mimeType and data are required" }, { status: 400 })
  }

  if (!ALLOWED_MIMES.includes(mimeType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  const buffer = Buffer.from(base64, "base64")
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 })
  }

  const ext = extname(fileName) || ""
  const safeExt = ext.toLowerCase()
  const allowedExt = [".png", ".jpg", ".jpeg", ".webp"]
  if (!allowedExt.includes(safeExt)) {
    return NextResponse.json({ error: "Unsupported file extension" }, { status: 400 })
  }

  const uploadId = crypto.randomUUID()
  const storageDir = join(process.cwd(), "uploads")
  if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true })
  const storageFile = `${uploadId}${safeExt}`
  const storagePath = join(storageDir, storageFile)
  writeFileSync(storagePath, buffer)

  const user = await prisma.user.findUnique({ where: { displayName: session.user.name } })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const attachment = await prisma.attachment.create({
    data: {
      targetType: targetType ?? "post",
      targetId: targetId ?? "",
      mimeType,
      sizeBytes: buffer.length,
      storageRef: storageFile,
    },
  })

  return NextResponse.json({ id: attachment.id })
}
