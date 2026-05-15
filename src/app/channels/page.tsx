'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface Channel {
  id: string
  name: string
  description: string | null
  creator: { displayName: string }
  _count: { posts: number }
}

export default function ChannelsPage() {
  const { data: session } = useSession()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadChannels = () => {
    setLoading(true)
    fetch('/api/channels')
      .then(res => res.json())
      .then(data => {
        setChannels(data)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadChannels()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data?.error || 'Failed to create channel')
      return
    }

    setName('')
    setDescription('')
    loadChannels()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Channels</h1>
          {session?.user ? (
            <button
              onClick={() => {
                const nameInput = document.getElementById('channel-name') as HTMLInputElement
                nameInput?.focus()
              }}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Channel
            </button>
          ) : (
            <p className="text-sm text-gray-800">Sign in to create a channel.</p>
          )}
        </div>

        {session?.user && (
          <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900">New channel</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="channel-name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Create channel
            </button>
          </form>
        )}

        <div className="mt-6 grid gap-4">
          {channels.length === 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-gray-800">
              No channels yet. Create the first channel to get started.
            </div>
          )}
          {channels.map(channel => (
            <div key={channel.id} className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-900">
                <a href={`/channels/${channel.id}`} className="text-blue-600 hover:underline">
                  {channel.name}
                </a>
              </h2>
              {channel.description && <p className="text-gray-800 mb-2">{channel.description}</p>}
              <p className="text-sm text-gray-700">
                Created by {channel.creator.displayName} • {channel._count.posts} posts
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}