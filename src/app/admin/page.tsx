'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from "next/link"

interface User {
  id: string
  displayName: string
  role: string
  createdAt: string
}

interface Channel {
  id: string
  name: string
  description: string | null
  createdAt: string
}

interface Post {
  id: string
  title: string
  channelId: string
  authorId: string
  createdAt: string
}

interface Reply {
  id: string
  body: string
  postId: string
  authorId: string
  createdAt: string
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return // Wait for session to load

    if (session?.user?.role !== 'admin') {
      router.push('/')
      return
    }
    loadData()
  }, [session, status, router])

  const loadData = async () => {
    try {
      const [usersRes, channelsRes, postsRes, repliesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/channels'),
        fetch('/api/posts'),
        fetch('/api/replies')
      ])
      const usersData = await usersRes.json()
      const channelsData = await channelsRes.json()
      const postsData = await postsRes.json()
      const repliesData = await repliesRes.json()
      setUsers(usersData)
      setChannels(channelsData)
      setPosts(postsData)
      setReplies(repliesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
    setLoading(false)
  }

  const deleteUser = async (id: string, name: string) => {
    const currentUserId = (session?.user as { id?: string })?.id
    if (currentUserId === id) {
      alert('You cannot delete your own admin account. Please use a different admin account to manage users.')
      return
    }

    if (!confirm(`Are you sure you want to delete the user "${name}"? This action cannot be undone and will also delete all their posts and replies.`)) return

    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        alert(`Failed to delete user: ${error.error || 'Unknown error'}`)
        return
      }
      setUsers(users.filter(u => u.id !== id))
      alert(`User "${name}" has been deleted successfully.`)
    } catch (error) {
      alert('Failed to delete user: Network error')
    }
  }

  const deleteChannel = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the channel "${name}"? This action cannot be undone and will also delete all posts and replies in this channel.`)) return
    try {
      const response = await fetch(`/api/channels/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        alert(`Failed to delete channel: ${error.error || 'Unknown error'}`)
        return
      }
      setChannels(channels.filter(c => c.id !== id))
      alert(`Channel "${name}" has been deleted successfully.`)
    } catch (error) {
      alert('Failed to delete channel: Network error')
    }
  }

  const deletePost = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the post "${title}"? This action cannot be undone and will also delete all replies to this post.`)) return
    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        alert(`Failed to delete post: ${error.error || 'Unknown error'}`)
        return
      }
      setPosts(posts.filter(p => p.id !== id))
      alert(`Post "${title}" has been deleted successfully.`)
    } catch (error) {
      alert('Failed to delete post: Network error')
    }
  }

  const deleteReply = async (id: string, body: string) => {
    const preview = body.length > 50 ? body.substring(0, 50) + '...' : body
    if (!confirm(`Are you sure you want to delete this reply? "${preview}"\n\nThis action cannot be undone.`)) return
    try {
      const response = await fetch(`/api/replies/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        alert(`Failed to delete reply: ${error.error || 'Unknown error'}`)
        return
      }
      setReplies(replies.filter(r => r.id !== id))
      alert('Reply has been deleted successfully.')
    } catch (error) {
      alert('Failed to delete reply: Network error')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Users */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Users ({users.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div key={user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-xs text-gray-700">Role: {user.role}</p>
                </div>
                <button
                  onClick={() => deleteUser(user.id, user.displayName)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={user.role === 'admin' || user.id === (session?.user as { id?: string })?.id}
                  title={user.role === 'admin'
                    ? 'Admin users cannot be deleted via this dashboard'
                    : user.id === (session?.user as { id?: string })?.id
                    ? 'Cannot delete your own account'
                    : 'Delete user'}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Channels ({channels.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {channels.map((channel) => (
              <div key={channel.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{channel.name}</p>
                  <p className="text-sm text-gray-800">{channel.description}</p>
                </div>
                <button
                  onClick={() => deleteChannel(channel.id, channel.name)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Posts ({posts.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {posts.map((post) => (
              <div key={post.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <Link href={`/posts/${post.id}`} className="font-medium hover:underline">
                    {post.title}
                  </Link>
                  <p className="text-sm text-gray-800">Channel: {post.channelId}</p>
                </div>
                <button
                  onClick={() => deletePost(post.id, post.title)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Replies */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Replies ({replies.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {replies.map((reply) => (
              <div key={reply.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium truncate">{reply.body.substring(0, 50)}...</p>
                  <p className="text-sm text-gray-800">Post: {reply.postId}</p>
                </div>
                <button
                  onClick={() => deleteReply(reply.id, reply.body)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}