export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Programming Q&A Discussion Platform
        </h1>
        <p className="text-lg text-gray-800 mb-8">
          This is a channel-based forum for programming discussions. Users can organize discussions into topic channels, ask questions, provide answers in threaded conversations, attach screenshots, vote on helpful content, and search across posts and users.
        </p>
        <a
          href="/channels"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse Channels
        </a>
      </div>
    </div>
  );
}
