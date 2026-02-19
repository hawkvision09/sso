"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Hero Section */}
        <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 text-center">
          {/* Logo */}
          <div className="mb-6">
            <span className="text-[120px] animate-pulse drop-shadow-[0_0_40px_rgba(102,126,234,0.8)]">
              🔐
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-purple-400 via-purple-600 to-pink-400 bg-clip-text text-transparent">
            HawkVision SSO
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mb-10 leading-relaxed">
            Secure, Passwordless Authentication for All Your Applications
          </p>

          {/* Feature Badges */}
          <div className="flex gap-4 mb-12 flex-wrap justify-center">
            <div className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold hover:bg-white/15 hover:-translate-y-0.5 transition-all">
              <span className="text-xl">⚡</span>
              <span>Lightning Fast</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold hover:bg-white/15 hover:-translate-y-0.5 transition-all">
              <span className="text-xl">🔒</span>
              <span>Highly Secure</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold hover:bg-white/15 hover:-translate-y-0.5 transition-all">
              <span className="text-xl">🌐</span>
              <span>Universal Access</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 flex-wrap justify-center">
            <button
              onClick={() => router.push("/login")}
              className="px-12 py-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white text-lg font-bold rounded-xl shadow-lg shadow-purple-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/60 transition-all min-w-[200px]"
            >
              Get Started
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-12 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white text-lg font-bold rounded-xl hover:bg-white/15 hover:-translate-y-1 transition-all min-w-[200px]"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="py-20 px-5 max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 text-center hover:-translate-y-2 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Register Your App
              </h3>
              <p className="text-white/70 leading-relaxed">
                Add your application to the SSO system and get your unique
                service ID
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 text-center hover:-translate-y-2 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Integrate SSO
              </h3>
              <p className="text-white/70 leading-relaxed">
                Redirect users to our authorization endpoint for seamless login
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 text-center hover:-translate-y-2 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-purple-800 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Secure Access
              </h3>
              <p className="text-white/70 leading-relaxed">
                Receive verified user data and manage sessions effortlessly
              </p>
            </div>
          </div>
        </div>

        {/* Key Features Section */}
        <div className="py-20 px-5 max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            Key Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-6xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Passwordless Login
              </h3>
              <p className="text-white/70 leading-relaxed">
                Email-based OTP authentication eliminates password
                vulnerabilities
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Single Session
              </h3>
              <p className="text-white/70 leading-relaxed">
                One active session per user ensures security and consistency
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-xl font-bold text-white mb-3">
                OAuth-like Flow
              </h3>
              <p className="text-white/70 leading-relaxed">
                Industry-standard authorization code flow for client
                applications
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Google Sheets DB
              </h3>
              <p className="text-white/70 leading-relaxed">
                Simple, transparent data storage with Google Sheets integration
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-6xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Admin Dashboard
              </h3>
              <p className="text-white/70 leading-relaxed">
                Comprehensive admin panel for managing services and users
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl transition-all">
              <div className="text-6xl mb-4">🎟️</div>
              <h3 className="text-xl font-bold text-white mb-3">
                Free Tier Support
              </h3>
              <p className="text-white/70 leading-relaxed">
                Auto-grant access to services with free tier enabled
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-10 px-5 text-center border-t border-white/10">
          <p className="text-white/50">
            © 2026 HawkVision SSO. Built with Next.js and Google Sheets.
          </p>
        </footer>
      </div>
    </div>
  );
}
