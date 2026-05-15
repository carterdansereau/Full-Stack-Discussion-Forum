import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

vi.mock('next-auth', () => {
  return {
    default: vi.fn(),
    getServerSession: vi.fn(),
  }
})

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { POST as signupPost } from '@/app/api/auth/signup/route'
import { POST as channelsPost } from '@/app/api/channels/route'
import { DELETE as channelDelete } from '@/app/api/channels/[id]/route'
import { POST as postsPost } from '@/app/api/posts/route'
import { POST as repliesPost, GET as repliesGet } from '@/app/api/replies/route'
import { POST as votesPost } from '@/app/api/votes/route'
import { POST as uploadsPost } from '@/app/api/uploads/route'
import { DELETE as userDelete } from '@/app/api/users/[id]/route'
import { GET as searchGet } from '@/app/api/search/route'

const mockedGetServerSession = vi.mocked(getServerSession)

type SessionLike = {
  user?: {
    id?: string
    name?: string
    role?: string
  }
}

function setSession(session: SessionLike | null) {
  mockedGetServerSession.mockResolvedValue(session as any)
}

function req(url: string, init?: RequestInit) {
  return new Request(url, init)
}

async function json(response: Response) {
  return response.json()
}

async function makeUser(displayName: string, role: 'user' | 'admin' = 'user') {
  const passwordHash = await bcrypt.hash('password123', 10)
  return prisma.user.create({
    data: {
      displayName,
      passwordHash,
      role,
    },
  })
}

async function makeChannel(createdBy: string, name = 'channel-a') {
  return prisma.channel.create({
    data: {
      name,
      description: 'desc',
      createdBy,
    },
  })
}

async function makePost(authorId: string, channelId: string, title = 'post title') {
  return prisma.post.create({
    data: {
      title,
      body: 'post body',
      authorId,
      channelId,
    },
  })
}

beforeAll(() => {
  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'inherit',
  })
})

beforeEach(async () => {
  mockedGetServerSession.mockReset()
  await prisma.vote.deleteMany()
  await prisma.reply.deleteMany()
  await prisma.post.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.user.deleteMany()

  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (fs.existsSync(uploadsDir)) {
    for (const file of fs.readdirSync(uploadsDir)) {
      fs.unlinkSync(path.join(uploadsDir, file))
    }
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Core functional API requirements', () => {
  it('1) signup creates user with hashed password', async () => {
    const response = await signupPost(
      req('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.1.1.1' },
        body: JSON.stringify({ displayName: 'new_user', password: 'password123' }),
      }) as any
    )

    expect(response.status).toBe(200)
    const created = await prisma.user.findUnique({ where: { displayName: 'new_user' } })
    expect(created).not.toBeNull()
    expect(created?.passwordHash).not.toBe('password123')
    expect(await bcrypt.compare('password123', created!.passwordHash)).toBe(true)
  })

  it('2) signup blocks duplicate usernames', async () => {
    await makeUser('dup_user')

    const response = await signupPost(
      req('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.1.1.1' },
        body: JSON.stringify({ displayName: 'dup_user', password: 'password123' }),
      }) as any
    )

    expect(response.status).toBe(409)
  })

  it('3) creating channel requires sign in', async () => {
    setSession(null)

    const response = await channelsPost(
      req('http://localhost:3000/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ name: 'new-channel', description: 'desc' }),
      }) as any
    )

    expect(response.status).toBe(401)
  })

  it('4) signed-in user can create channel', async () => {
    const user = await makeUser('channel_creator')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    const response = await channelsPost(
      req('http://localhost:3000/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ name: 'new-channel', description: 'desc' }),
      }) as any
    )

    expect(response.status).toBe(200)
    const channel = await prisma.channel.findUnique({ where: { name: 'new-channel' } })
    expect(channel?.createdBy).toBe(user.id)
  })

  it('5) creating post requires sign in', async () => {
    setSession(null)

    const response = await postsPost(
      req('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ title: 't', body: 'b', channelId: 'x' }),
      }) as any
    )

    expect(response.status).toBe(401)
  })

  it('6) creating post validates required fields', async () => {
    const user = await makeUser('poster')
    const channel = await makeChannel(user.id, 'post-channel')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    const response = await postsPost(
      req('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ title: '', body: 'body', channelId: channel.id }),
      }) as any
    )

    expect(response.status).toBe(400)
  })

  it('7) replies support nested threading via parentReplyId', async () => {
    const user = await makeUser('replier')
    const channel = await makeChannel(user.id, 'reply-channel')
    const post = await makePost(user.id, channel.id, 'Threaded')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    const parentRes = await repliesPost(
      req('http://localhost:3000/api/replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ postId: post.id, body: 'Parent reply' }),
      }) as any
    )
    const parent = await json(parentRes)

    const childRes = await repliesPost(
      req('http://localhost:3000/api/replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ postId: post.id, parentReplyId: parent.id, body: 'Child reply' }),
      }) as any
    )

    expect(childRes.status).toBe(200)
    const child = await json(childRes)
    expect(child.parentReplyId).toBe(parent.id)

    const listRes = await repliesGet(
      req(`http://localhost:3000/api/replies?postId=${post.id}`) as any
    )
    const list = await json(listRes)
    expect(list.length).toBe(2)
  })

  it('8) voting enforces one vote per user/target (upsert update)', async () => {
    const user = await makeUser('voter')
    const channel = await makeChannel(user.id, 'vote-channel')
    const post = await makePost(user.id, channel.id, 'Vote Post')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    await votesPost(
      req('http://localhost:3000/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ targetType: 'post', targetId: post.id, value: 1 }),
      }) as any
    )

    await votesPost(
      req('http://localhost:3000/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ targetType: 'post', targetId: post.id, value: -1 }),
      }) as any
    )

    const votes = await prisma.vote.findMany({ where: { userId: user.id, targetType: 'post', targetId: post.id } })
    expect(votes).toHaveLength(1)
    expect(votes[0].value).toBe(-1)
  })

  it('9) vote value 0 removes existing vote (neutral state)', async () => {
    const user = await makeUser('neutral_voter')
    const channel = await makeChannel(user.id, 'vote-channel-2')
    const post = await makePost(user.id, channel.id, 'Vote Post 2')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    await votesPost(
      req('http://localhost:3000/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ targetType: 'post', targetId: post.id, value: 1 }),
      }) as any
    )

    const removeRes = await votesPost(
      req('http://localhost:3000/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({ targetType: 'post', targetId: post.id, value: 0 }),
      }) as any
    )

    expect(removeRes.status).toBe(200)
    const remaining = await prisma.vote.findMany({ where: { userId: user.id, targetType: 'post', targetId: post.id } })
    expect(remaining).toHaveLength(0)
  })

  it('10) non-admin cannot delete channel', async () => {
    const user = await makeUser('normal_user')
    const channel = await makeChannel(user.id, 'admin-channel-delete')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    const response = await channelDelete(
      req('http://localhost:3000/api/channels/x', {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      }) as any,
      { params: Promise.resolve({ id: channel.id }) } as any
    )

    expect(response.status).toBe(403)
  })

  it('11) admin cannot delete another admin account', async () => {
    const adminA = await makeUser('admin_a', 'admin')
    const adminB = await makeUser('admin_b', 'admin')
    setSession({ user: { id: adminA.id, name: adminA.displayName, role: 'admin' } })

    const response = await userDelete(
      req('http://localhost:3000/api/users/x', {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      }) as any,
      { params: Promise.resolve({ id: adminB.id }) } as any
    )

    expect(response.status).toBe(403)
  })

  it('12) upload rejects unsupported mime type', async () => {
    const user = await makeUser('uploader')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    const response = await uploadsPost(
      req('http://localhost:3000/api/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({
          fileName: 'bad.gif',
          mimeType: 'image/gif',
          data: Buffer.from('abc').toString('base64'),
          targetType: 'post',
          targetId: 'abc',
        }),
      }) as any
    )

    expect(response.status).toBe(400)
  })

  it('13) upload accepts png and stores attachment metadata', async () => {
    const user = await makeUser('good_uploader')
    const channel = await makeChannel(user.id, 'upload-channel')
    const post = await makePost(user.id, channel.id, 'Upload Post')
    setSession({ user: { id: user.id, name: user.displayName, role: 'user' } })

    const response = await uploadsPost(
      req('http://localhost:3000/api/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
        body: JSON.stringify({
          fileName: 'ok.png',
          mimeType: 'image/png',
          data: Buffer.from('png-data').toString('base64'),
          targetType: 'post',
          targetId: post.id,
        }),
      }) as any
    )

    expect(response.status).toBe(200)
    const payload = await json(response)
    const attachment = await prisma.attachment.findUnique({ where: { id: payload.id } })
    expect(attachment).not.toBeNull()
    expect(attachment?.mimeType).toBe('image/png')
  })

  it('14) author search returns posts/replies with author displayName', async () => {
    const user = await makeUser('author_1')
    const channel = await makeChannel(user.id, 'search-channel')
    const post = await makePost(user.id, channel.id, 'Author Post')
    await prisma.reply.create({
      data: {
        postId: post.id,
        authorId: user.id,
        body: 'Author reply',
      },
    })

    const response = await searchGet(
      req('http://localhost:3000/api/search?type=author&q=author_1') as any
    )

    expect(response.status).toBe(200)
    const payload = await json(response)
    expect(payload.user.displayName).toBe('author_1')
    expect(payload.posts[0].author.displayName).toBe('author_1')
    expect(payload.replies[0].author.displayName).toBe('author_1')
  })
})
