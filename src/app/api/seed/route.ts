import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST() {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('password', 10)
    const admin = await prisma.user.upsert({
      where: { displayName: 'admin' },
      update: { passwordHash: adminPassword, role: 'admin' },
      create: {
        displayName: 'admin',
        passwordHash: adminPassword,
        role: 'admin',
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Admin user created/updated successfully',
      admin: { displayName: admin.displayName, role: admin.role }
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
