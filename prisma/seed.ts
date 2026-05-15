import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
const adapter = new PrismaBetterSqlite3({ url: databaseUrl })

const prisma = new PrismaClient({ adapter })

async function main() {
  // Always create admin user
  const adminPassword = await bcrypt.hash('password', 10)
  const admin = await prisma.user.upsert({
    where: { displayName: 'admin' },
    update: {},
    create: {
      displayName: 'admin',
      passwordHash: adminPassword,
      role: 'admin',
    },
  })

  // Conditionally create all non-admin seed data
  const seedSampleData = process.env.SEED_SAMPLE_DATA !== 'false'
  
  if (seedSampleData) {
    // Create default channels
    const general = await prisma.channel.upsert({
      where: { name: 'general' },
      update: {},
      create: {
        name: 'general',
        description: 'General programming discussions',
        createdBy: admin.id,
      },
    })

    const javascript = await prisma.channel.upsert({
      where: { name: 'javascript' },
      update: {},
      create: {
        name: 'javascript',
        description: 'JavaScript programming questions',
        createdBy: admin.id,
      },
    })

    const python = await prisma.channel.upsert({
      where: { name: 'python' },
      update: {},
      create: {
        name: 'python',
        description: 'Python programming questions',
        createdBy: admin.id,
      },
    })

    // Create a test user
    const testPassword = await bcrypt.hash('test123', 10)
    const testUser = await prisma.user.upsert({
      where: { displayName: 'testuser' },
      update: {},
      create: {
        displayName: 'testuser',
        passwordHash: testPassword,
        role: 'user',
      },
    })

    // Create some posts
    const post1 = await prisma.post.upsert({
      where: { id: 'post1' },
      update: {},
      create: {
        id: 'post1',
        title: 'How to get started with Next.js?',
        body: 'I\'m new to Next.js and want to build a forum application. Any tips?',
        channelId: javascript.id,
        authorId: testUser.id,
      },
    })

    const post2 = await prisma.post.upsert({
      where: { id: 'post2' },
      update: {},
      create: {
        id: 'post2',
        title: 'Python list comprehensions',
        body: 'Can someone explain how list comprehensions work in Python?',
        channelId: python.id,
        authorId: admin.id,
      },
    })

    // Create some replies
    await prisma.reply.upsert({
      where: { id: 'reply1' },
      update: {},
      create: {
        id: 'reply1',
        body: 'Next.js is great! Start with the official tutorial. Use App Router for new projects.',
        postId: post1.id,
        authorId: admin.id,
      },
    })

    await prisma.reply.upsert({
      where: { id: 'reply2' },
      update: {},
      create: {
        id: 'reply2',
        body: 'List comprehensions are a concise way to create lists. [x*2 for x in range(10)] creates [0,2,4,...,18]',
        postId: post2.id,
        authorId: testUser.id,
      },
    })

    console.log('Admin user and sample data seeded successfully')
  } else {
    console.log('Admin-only seed complete (blank slate mode)')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })