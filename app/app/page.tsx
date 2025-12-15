"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { TokenTransfer } from "@/components/TokenTransfer";

export default function Home() {
  const MINT_ADDRESS = process.env.NEXT_PUBLIC_MINT_ADDRESS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white overflow-hidden">
      {/* Top section of Z */}
      <nav className="relative z-20 border-b border-cyan-500/30 bg-slate-900/80 backdrop-blur-xl shadow-2xl"
           style={{ transform: 'perspective(1000px) rotateX(2deg)', transformStyle: 'preserve-3d' }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse shadow-lg shadow-cyan-500/50"></div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Subscription Token
            </h1>
          </div>
          <div style={{ transform: 'translateZ(20px)' }}>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      {/* Diagonal middle section of Z */}
      <div className="relative py-20" style={{ perspective: '2000px' }}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Hero section - top right */}
          <div className="mb-32 text-right transform transition-all duration-700 hover:scale-105"
               style={{ 
                 transform: 'perspective(1500px) rotateY(-5deg) translateZ(50px)',
                 transformStyle: 'preserve-3d'
               }}>
            <div className="inline-block bg-gradient-to-br from-blue-900/40 to-cyan-900/40 backdrop-blur-xl rounded-3xl p-12 border border-cyan-500/30 shadow-2xl">
              <h2 className="text-6xl font-black mb-6 bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent"
                  style={{ transform: 'translateZ(30px)' }}>
                Transfer with Subscription
              </h2>
              <p className="text-xl text-cyan-200 max-w-2xl ml-auto leading-relaxed"
                 style={{ transform: 'translateZ(20px)' }}>
                Revolutionary token transfer system that requires active subscription validation. 
                <span className="block mt-2 text-2xl font-bold text-blue-400">0.01 SOL = 30 Days</span>
              </p>
            </div>
          </div>

          {/* Diagonal connector - visual element */}
          <div className="relative h-32 my-16">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 transform -translate-y-1/2 rotate-[-15deg] shadow-lg shadow-cyan-500/50"
                 style={{ 
                   transform: 'perspective(1000px) rotateY(-10deg) rotateZ(-15deg) translateZ(30px)',
                   boxShadow: '0 0 50px rgba(34, 211, 238, 0.6)'
                 }}></div>
          </div>

          {/* Main content cards - diagonal arrangement */}
          <div className="grid md:grid-cols-2 gap-8 transform"
               style={{ 
                 transform: 'perspective(1500px) rotateY(5deg) translateZ(40px)',
                 transformStyle: 'preserve-3d'
               }}>
            <div className="transform transition-all duration-500 hover:scale-105 hover:translateZ-10"
                 style={{ transform: 'translateZ(60px) rotateY(-3deg)' }}>
              <div className="bg-gradient-to-br from-slate-800/90 to-blue-900/50 backdrop-blur-xl rounded-2xl border border-cyan-500/40 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                  <SubscriptionStatus />
                </div>
              </div>
            </div>

            <div className="transform transition-all duration-500 hover:scale-105 hover:translateZ-10"
                 style={{ transform: 'translateZ(40px) rotateY(3deg)' }}>
              <div className="bg-gradient-to-br from-slate-800/90 to-blue-900/50 backdrop-blur-xl rounded-2xl border border-blue-500/40 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                  <TokenTransfer mintAddress={MINT_ADDRESS} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section of Z */}
      <div className="relative mt-20 transform"
           style={{ 
             transform: 'perspective(1000px) rotateX(-2deg) translateZ(20px)',
             transformStyle: 'preserve-3d'
           }}>
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <div className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 backdrop-blur-xl rounded-3xl p-10 border border-cyan-500/30 shadow-2xl transform transition-all duration-500 hover:scale-[1.02]"
               style={{ transform: 'translateZ(50px)' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                How It Works
              </h3>
            </div>
            
            <div className="grid md:grid-cols-5 gap-6">
              {[
                { num: "01", text: "Connect your Solana wallet" },
                { num: "02", text: "Initialize subscription account" },
                { num: "03", text: "Pay 0.01 SOL for activation" },
                { num: "04", text: "Transfer tokens freely" },
                { num: "05", text: "Extend anytime for 30 days" }
              ].map((step, i) => (
                <div key={i} 
                     className="relative group transform transition-all duration-300 hover:scale-110"
                     style={{ transform: `translateZ(${30 + i * 10}px) rotateY(${i % 2 ? 2 : -2}deg)` }}>
                  <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20 shadow-lg group-hover:border-blue-500/50 transition-colors">
                    <div className="text-5xl font-black bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform">
                      {step.num}
                    </div>
                    <p className="text-sm text-cyan-200 leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3D floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-cyan-500/30 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              transform: `translateZ(${Math.random() * 100}px)`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateZ(20px); opacity: 0.3; }
          50% { transform: translateY(-50px) translateZ(80px); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
