'use client'

import { useSession, signOut } from "next-auth/react"

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <a href="/" className="text-lg font-semibold text-gray-900">
          Q&A Forum
        </a>
        <nav className="flex flex-1 items-center justify-between ml-6 text-sm">
          {/* Left: page links */}
          <div className="flex items-center gap-4">
            <a href="/channels" className="text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Channels
            </a>
            <a href="/search" className="text-gray-700 hover:text-gray-900 focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Search
            </a>
            {session?.user?.role === "admin" && (
              <a href="/admin" className="rounded-md bg-amber-100 px-3 py-1 text-amber-800 hover:bg-amber-200 focus:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                Admin Dashboard
              </a>
            )}
          </div>
          {/* Right: auth */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-md bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Sign out
                </button>
                <span className="text-sm text-gray-700"><span className="mr-1">Logged in as</span>{session.user?.name}</span>
              </>
            ) : (
              <a
                href="/auth/signin"
                className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
              >
                Sign in
              </a>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}