'use client'

import { useState } from 'react'

type SearchType = 'posts' | 'replies' | 'author' | 'top-user' | 'bottom-user' | 'top-content' | 'bottom-content'

export default function SearchPage() {
  const [type, setType] = useState<SearchType>('posts')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsQuery = type === 'posts' || type === 'replies' || type === 'author'

  const hasAnyResults = (data: any) => {
    if (!data) return false
    const hasListResults = Array.isArray(data.results) && data.results.length > 0
    const hasAuthorPosts = Array.isArray(data.posts) && data.posts.length > 0
    const hasAuthorReplies = Array.isArray(data.replies) && data.replies.length > 0
    const hasUserCard = Boolean(data.user)
    const hasUserStats = data.postCount !== undefined
    const hasRankedContent = Boolean(data.top || data.bottom)
    return hasListResults || hasAuthorPosts || hasAuthorReplies || hasUserCard || hasUserStats || hasRankedContent
  }

  const runSearch = async (loadMore = false) => {
    setError(null)
    setLoading(true)

    try {
      const params = new URLSearchParams({ type })
      if (needsQuery) params.set('q', query)
      params.set('offset', String(loadMore ? offset : 0))

      const res = await fetch(`/api/search?${params.toString()}`)
      const data = await res.json()

      setLoading(false)

      if (!res.ok) {
        setError(data?.error ?? 'Search failed')
        return
      }

      const newOffset = (data.offset ?? 0) + (data.results?.length ?? 0)
      setOffset(newOffset)
      setHasMore(Boolean(data.hasMore))

      if (loadMore && data.results) {
        setResults((prev: any) => ({
          ...data,
          results: [...(prev?.results ?? []), ...data.results],
        }))
      } else {
        setResults(data)
      }
    } catch (err) {
      setLoading(false)
      setError('Search request failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl py-10 px-4">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">Search</h1>

        <div className="grid gap-4 rounded-lg bg-white p-6 shadow">
          <div className="grid gap-2 md:grid-cols-3 md:items-end">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Search type</span>
              <select
                value={type}
                onChange={e => setType(e.target.value as SearchType)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              >
                <option value="posts">Posts (text)</option>
                <option value="replies">Replies (text)</option>
                <option value="author">By author</option>
                <option value="top-user">User with most posts</option>
                <option value="bottom-user">User with fewest posts</option>
                <option value="top-content">Highest-ranked content</option>
                <option value="bottom-content">Lowest-ranked content</option>
              </select>
            </label>

            {needsQuery && (
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Query</span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-700"
                />
              </label>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setOffset(0)
                runSearch(false)
              }}
              className="self-start rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Search
            </button>

            {loading && <p className="text-sm text-gray-800">Searching...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {results && (
              <div className="mt-4 space-y-6">
                {results.user && (
                  <div className="rounded-md border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Current User</h2>
                    <p className="text-gray-800">
                      <strong>Name:</strong> {results.user.displayName}
                    </p>
                    <p className="text-gray-700 text-sm">
                      <strong>ID:</strong> {results.user.id}
                    </p>
                  </div>
                )}

                {results.results && results.results.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Results ({results.results.length})
                    </h2>
                    <div className="space-y-3">
                      {results.results.map((item: any) => (
                        <div
                          key={item.id}
                          className="rounded-md border border-gray-200 p-4 hover:shadow-md transition"
                        >
                          {item.title ? (
                            <>
                              <h3 className="font-semibold text-gray-900">
                                <a href={`/posts/${item.id}`} className="hover:underline">
                                  {item.title}
                                </a>
                              </h3>
                              <p className="text-gray-800 mt-1">{item.body}</p>
                              <div className="flex gap-4 mt-2 text-sm text-gray-700">
                                {item.author?.displayName && <span>By: {item.author.displayName}</span>}
                                <span>Channel: {item.channel?.name}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-800">{item.body}</p>
                              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-700">
                                {item.author?.displayName && <span>By: {item.author.displayName}</span>}
                                {item.post?.id && (
                                  <a
                                    className="text-blue-600 hover:underline"
                                    href={`/posts/${item.post.id}?highlight=${item.id}`}
                                  >
                                    View in post: {item.post.title}
                                  </a>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {hasMore && (
                      <button
                        onClick={() => runSearch(true)}
                        className="mt-4 rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-900"
                      >
                        Load more
                      </button>
                    )}
                  </div>
                )}

                {results.posts && results.posts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Posts ({results.posts.length})
                    </h2>
                    <div className="space-y-3">
                      {results.posts.map((post: any) => (
                        <div
                          key={post.id}
                          className="rounded-md border border-gray-200 p-4 hover:shadow-md transition"
                        >
                          <h3 className="font-semibold text-gray-900">
                            <a href={`/posts/${post.id}`} className="text-blue-600 hover:underline">
                              {post.title}
                            </a>
                          </h3>
                          <p className="text-gray-800 mt-1">{post.body}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-700">
                            {post.author?.displayName && <span>By: {post.author.displayName}</span>}
                            <span>Channel: {post.channel?.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.replies && results.replies.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Replies ({results.replies.length})
                    </h2>
                    <div className="space-y-3">
                      {results.replies.map((reply: any) => (
                        <div
                          key={reply.id}
                          className="rounded-md border border-gray-200 p-4 hover:shadow-md transition"
                        >
                          <p className="text-gray-800">{reply.body}</p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-700">
                            {reply.author?.displayName && <span>By: {reply.author.displayName}</span>}
                            {reply.post?.id && (
                              <a
                                className="text-blue-600 hover:underline"
                                href={`/posts/${reply.post.id}?highlight=${reply.id}`}
                              >
                                View in post: {reply.post.title}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.postCount !== undefined && (
                  <div className="rounded-md border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">User Stats</h2>
                    {results.user ? (
                      <>
                        <p className="text-gray-800">
                          <strong>Name:</strong> {results.user.displayName}
                        </p>
                        <p className="text-gray-800">
                          <strong>Post Count:</strong> {results.postCount}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-700">No data available</p>
                    )}
                  </div>
                )}

                {(results.top || results.bottom) && (
                  <div className="rounded-md border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Content Info</h2>
                    {results.top ? (
                      <div>
                        <p className="text-gray-800">
                          <strong>Highest Ranked:</strong>
                        </p>
                        {results.top.content ? (
                          <div className="mt-2">
                            {results.top.content.title ? (
                              <a
                                href={`/posts/${results.top.content.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {results.top.content.title}
                              </a>
                            ) : (
                              <a
                                href={`/posts/${results.top.content.post.id}?highlight=${results.top.content.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {results.top.content.body?.slice(0, 80)}...
                              </a>
                            )}
                            <p className="text-sm text-gray-700 mt-1">
                              Score: {results.top._sum.value ?? 0}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-700">Content not found</p>
                        )}
                      </div>
                    ) : results.bottom ? (
                      <div>
                        <p className="text-gray-800">
                          <strong>Lowest Ranked:</strong>
                        </p>
                        {results.bottom.content ? (
                          <div className="mt-2">
                            {results.bottom.content.title ? (
                              <a
                                href={`/posts/${results.bottom.content.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {results.bottom.content.title}
                              </a>
                            ) : (
                              <a
                                href={`/posts/${results.bottom.content.post.id}?highlight=${results.bottom.content.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {results.bottom.content.body?.slice(0, 80)}...
                              </a>
                            )}
                            <p className="text-sm text-gray-700 mt-1">
                              Score: {results.bottom._sum.value ?? 0}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-700">Content not found</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-700">No data available</p>
                    )}
                  </div>
                )}

                {!hasAnyResults(results) && (
                  <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                    <p className="text-gray-800">No results found. Try a different search.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
