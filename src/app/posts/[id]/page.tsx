'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Reply {
  id: string
  body: string
  createdAt: string
  parentReplyId: string | null
  author: { displayName: string }
  childReplies?: Reply[]
  votes?: { score: number; userVote: number }
  attachments?: { id: string; mimeType: string; sizeBytes: number; url: string }[]
}

interface Post {
  id: string
  title: string
  body: string
  createdAt: string
  author: { displayName: string }
  channel: { name: string }
  _count: { replies: number }
  votes?: { score: number; userVote: number }
  attachments?: { id: string; mimeType: string; sizeBytes: number; url: string }[]
}

function buildReplyTree(replies: Reply[]): Reply[] {
  const map = new Map<string, Reply>()
  const roots: Reply[] = []
  replies.forEach(reply => {
    reply.childReplies = []
    map.set(reply.id, reply)
  })
  replies.forEach(reply => {
    if (reply.parentReplyId) {
      const parent = map.get(reply.parentReplyId)
      if (parent) {
        parent.childReplies!.push(reply)
      }
    } else {
      roots.push(reply)
    }
  })
  return roots
}

export default function PostPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const highlightReplyId = searchParams.get('highlight')
  const { data: session } = useSession()
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  useEffect(() => {
    if (!loading && highlightReplyId) {
      const el = document.getElementById(`reply-${highlightReplyId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-white')
      }
    }
  }, [loading, highlightReplyId, replies])

  const loadData = async () => {
    const [postRes, repliesRes] = await Promise.all([
      fetch(`/api/posts/${id}`),
      fetch(`/api/replies?postId=${id}`)
    ])
    const postData = await postRes.json()
    const repliesData = await repliesRes.json()
    
    // Fetch votes for post
    const postVotesRes = await fetch(`/api/votes?targetType=post&targetId=${id}`)
    const postVotes = await postVotesRes.json()
    postData.votes = postVotes
    
    // Fetch votes for replies
    const replyVotesPromises = repliesData.map((reply: Reply) =>
      fetch(`/api/votes?targetType=reply&targetId=${reply.id}`).then(res => res.json())
    )
    const replyVotes = await Promise.all(replyVotesPromises)
    repliesData.forEach((reply: Reply, index: number) => {
      reply.votes = replyVotes[index]
    })
    
    setPost(postData)
    setReplies(buildReplyTree(repliesData))
    setLoading(false)
  }

  const handleVote = async (targetType: 'post' | 'reply', targetId: string, value: number, currentUserVote: number) => {
    if (!session) {
      alert('You must be signed in to vote')
      return
    }
    // Clicking the same arrow again removes the vote
    const sendValue = currentUserVote === value ? 0 : value
    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, value: sendValue })
      })
      await loadData()
    } catch (error) {
      alert('Failed to vote')
    }
  }

  const handleReply = async (parentReplyId?: string) => {
    if (!session) {
      alert('You must be signed in to reply')
      return
    }
    if (!replyText.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: id,
          parentReplyId: parentReplyId || null,
          body: replyText.trim()
        })
      })
      if (!response.ok) {
        const error = await response.json()
        alert(error.error || 'Failed to post reply')
        setSubmitting(false)
        return
      }

      const replyData = await response.json()
      if (replyFile) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(replyFile)
        })

        const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
        if (match) {
          const mimeType = match[1]
          const base64 = match[2]
          await fetch('/api/uploads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: replyFile.name,
              mimeType,
              data: base64,
              targetType: 'reply',
              targetId: replyData.id,
            }),
          })
        }
      }

      setReplyText('')
      setReplyFile(null)
      setReplyingTo(null)
      await loadData()
    } catch (error) {
      alert('Failed to post reply')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  if (!post) return <div className="min-h-screen flex items-center justify-center">Post not found</div>

  const renderReply = (reply: Reply, depth = 0) => {
    const isHighlighted = reply.id === highlightReplyId
    return (
      <div
        id={`reply-${reply.id}`}
        key={reply.id}
        style={{ marginLeft: `${depth * 20}px` }}
        className={`border-l-2 border-gray-200 pl-4 mb-4 ${isHighlighted ? 'bg-yellow-50' : ''}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleVote('reply', reply.id, 1, reply.votes?.userVote ?? 0)}
              className={`text-sm ${reply.votes?.userVote === 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'} hover:text-blue-600`}
              aria-label={reply.votes?.userVote === 1 ? 'Remove upvote' : 'Upvote reply'}
              aria-pressed={reply.votes?.userVote === 1}
              title={reply.votes?.userVote === 1 ? 'Upvoted (click to remove)' : 'Upvote'}
            >
              ▲
            </button>
            <span className="text-sm font-medium">{reply.votes?.score || 0}</span>
            <button
              onClick={() => handleVote('reply', reply.id, -1, reply.votes?.userVote ?? 0)}
              className={`text-sm ${reply.votes?.userVote === -1 ? 'text-red-600 font-semibold' : 'text-gray-400'} hover:text-red-600`}
              aria-label={reply.votes?.userVote === -1 ? 'Remove downvote' : 'Downvote reply'}
              aria-pressed={reply.votes?.userVote === -1}
              title={reply.votes?.userVote === -1 ? 'Downvoted (click to remove)' : 'Downvote'}
            >
              ▼
            </button>
            {(reply.votes?.userVote ?? 0) !== 0 && (
              <span className="text-[10px] text-gray-700 mt-1">
                {reply.votes?.userVote === 1 ? 'Upvoted' : 'Downvoted'}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-gray-700">{reply.body}</p>
            <p className="text-sm text-gray-700 mb-2">
              By {reply.author.displayName}
            </p>
            {reply.attachments && reply.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {reply.attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-24 h-24 overflow-hidden rounded border"
                  >
                    <img
                      src={att.url}
                      alt="Reply attachment"
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
            {session && (
              <button
                onClick={() => setReplyingTo(reply.id)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Reply
              </button>
            )}
          </div>
        </div>
        {replyingTo === reply.id && (
          <div className="mt-2 ml-8">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full p-2 border rounded text-gray-900"
              rows={3}
            />
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">Attach image (optional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleReply(reply.id)}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null)
                  setReplyText('')
                  setReplyFile(null)
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {reply.childReplies?.map(child => renderReply(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-start gap-4 mb-8">
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleVote('post', post.id, 1, post.votes?.userVote ?? 0)}
              className={`text-sm ${post.votes?.userVote === 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'} hover:text-blue-600`}
              aria-label={post.votes?.userVote === 1 ? 'Remove upvote' : 'Upvote post'}
              aria-pressed={post.votes?.userVote === 1}
              title={post.votes?.userVote === 1 ? 'Upvoted (click to remove)' : 'Upvote'}
            >
              ▲
            </button>
            <span className="text-sm font-medium">{post.votes?.score || 0}</span>
            <button
              onClick={() => handleVote('post', post.id, -1, post.votes?.userVote ?? 0)}
              className={`text-sm ${post.votes?.userVote === -1 ? 'text-red-600 font-semibold' : 'text-gray-400'} hover:text-red-600`}
              aria-label={post.votes?.userVote === -1 ? 'Remove downvote' : 'Downvote post'}
              aria-pressed={post.votes?.userVote === -1}
              title={post.votes?.userVote === -1 ? 'Downvoted (click to remove)' : 'Downvote'}
            >
              ▼
            </button>
            {(post.votes?.userVote ?? 0) !== 0 && (
              <span className="text-[10px] text-gray-700 mt-1">
                {post.votes?.userVote === 1 ? 'Upvoted' : 'Downvoted'}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4 text-gray-900">{post.title}</h1>
            <p className="text-gray-700 mb-4">{post.body}</p>
            {post.attachments && post.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-32 h-32 overflow-hidden rounded border"
                  >
                    <img src={att.url} alt="Post attachment" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-700 mb-8">
              By {post.author.displayName} in {post.channel.name} • {post._count.replies} replies
            </p>
          </div>
        </div>
        
        {session && (
          <div className="mb-8">
            <button
              onClick={() => setReplyingTo('post')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reply to Post
            </button>
            {replyingTo === 'post' && (
              <div className="mt-4">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full p-2 border rounded text-gray-900"
                  rows={4}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700">Attach image (optional)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
                    className="mt-1"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleReply()}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Posting...' : 'Post Reply'}
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyText('')
                      setReplyFile(null)
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Replies</h2>
          {replies.length === 0 ? (
            <p className="text-gray-500">No replies yet.</p>
          ) : (
            replies.map(reply => renderReply(reply))
          )}
        </div>
      </div>
    </div>
  )
}