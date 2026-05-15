'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Post {
  id: string
  title: string
  body: string
  createdAt: string
  author: { displayName: string }
  _count: { replies: number }
}

export default function ChannelPage() {
  const { data: session } = useSession()
  const { id } = useParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPosts = () => {
    if (!id) return
    setLoading(true)
    fetch(`/api/posts?channelId=${id}`)
      .then(res => res.json())
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadPosts()
  }, [id])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!id) return

    const postRes = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: id, title, body }),
    })

    const postData = await postRes.json()
    if (!postRes.ok) {
      setError(postData?.error || 'Failed to create post')
      return
    }

    if (file) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })

      const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
      if (match) {
        const mimeType = match[1]
        const base64 = match[2]
        await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType,
            data: base64,
            targetType: 'post',
            targetId: postData.id,
          }),
        })
      }
    }

    setTitle('')
    setBody('')
    setFile(null)
    loadPosts()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
          {session?.user ? (
            <p className="text-sm text-gray-800">Create a post below.</p>
          ) : (
            <p className="text-sm text-gray-800">Sign in to post.</p>
          )}
        </div>

        {session?.user && (
          <form onSubmit={handleCreate} className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">New post</h2>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
                rows={4}
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Screenshot (optional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Post
            </button>
          </form>
        )}

        <div className="grid gap-4">
          {posts.length === 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-gray-800">
              No posts yet. Be the first to post in this channel.
            </div>
          )}
          {posts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">
                <a href={`/posts/${post.id}`} className="text-blue-600 hover:underline">
                  {post.title}
                </a>
              </h2>
              <p className="text-gray-700 mb-2">{post.body}</p>
              <p className="text-sm text-gray-700">
                By {post.author.displayName} • {post._count.replies} replies
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}