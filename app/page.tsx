import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-5xl font-bold text-amber-400 mb-4">FortifyFi</h1>
        <p className="text-gray-300 text-lg mb-2">Your finances. Your fortress.</p>
        <p className="text-gray-500 text-sm mb-10">
          Build your defenses through financial discipline. The stronger your savings, the stronger your city.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 border border-amber-500 text-amber-400 hover:bg-amber-500/10 font-semibold rounded-lg transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}
