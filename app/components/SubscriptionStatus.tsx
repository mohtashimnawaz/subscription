"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getProgram, getSubscriptionPDA } from "@/lib/anchor";
import { SUBSCRIPTION_FEE } from "@/lib/constants";
import { SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

export function SubscriptionStatus() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const fetchSubscription = async () => {
    if (!wallet.publicKey) return;

    try {
      const program = getProgram(connection, wallet);
      const [subscriptionPDA] = getSubscriptionPDA(wallet.publicKey);

      const account = await program.account.subscriptionAccount.fetchNullable(subscriptionPDA);
      
      if (account) {
        setSubscriptionData(account);
        const now = Math.floor(Date.now() / 1000);
        setIsExpired(account.expiryTimestamp.toNumber() < now);
      } else {
        setSubscriptionData(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  useEffect(() => {
    fetchSubscription();
    const interval = setInterval(fetchSubscription, 10000);
    return () => clearInterval(interval);
  }, [wallet.publicKey, connection]);

  const handleInitialize = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    setLoading(true);
    try {
      const program = getProgram(connection, wallet);
      const [subscriptionPDA] = getSubscriptionPDA(wallet.publicKey);

      await program.methods
        .initializeSubscription()
        .accounts({
          owner: wallet.publicKey,
          subscriptionAccount: subscriptionPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await fetchSubscription();
      alert("Subscription account initialized!");
    } catch (error) {
      console.error("Error initializing subscription:", error);
      alert("Failed to initialize subscription");
    } finally {
      setLoading(false);
    }
  };

  const handlePaySubscription = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;

    setLoading(true);
    try {
      const program = getProgram(connection, wallet);
      const [subscriptionPDA] = getSubscriptionPDA(wallet.publicKey);

      // Treasury wallet (in production, use a real treasury address)
      const treasury = Keypair.generate().publicKey;

      await program.methods
        .paySubscription()
        .accounts({
          payer: wallet.publicKey,
          subscriptionAccount: subscriptionPDA,
          treasury: treasury,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await fetchSubscription();
      alert("Subscription paid successfully!");
    } catch (error) {
      console.error("Error paying subscription:", error);
      alert("Failed to pay subscription");
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-cyan-300">Connect wallet to view subscription</p>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            No Subscription
          </h2>
          <p className="text-cyan-300 text-center text-sm">Initialize to get started</p>
        </div>
        <button
          onClick={handleInitialize}
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105 disabled:scale-100"
        >
          {loading ? "Initializing..." : "Initialize Subscription"}
        </button>
      </div>
    );
  }

  const expiryDate = new Date(subscriptionData.expiryTimestamp.toNumber() * 1000);
  const isActive = !isExpired && subscriptionData.expiryTimestamp.toNumber() > 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${isActive ? 'from-green-500 to-emerald-600' : 'from-red-500 to-orange-600'} flex items-center justify-center shadow-lg`}>
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isActive ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            )}
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Subscription Status
        </h2>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-purple-500/20">
          <span className="text-cyan-300 font-medium">Status</span>
          <span className={`font-bold text-lg ${isActive ? "text-green-400" : "text-red-400"}`}>
            {isActive ? "✓ Active" : "✗ Expired"}
          </span>
        </div>
        
        {subscriptionData.expiryTimestamp.toNumber() > 0 && (
          <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-cyan-500/20">
            <span className="text-cyan-300 font-medium">Expires</span>
            <span className="font-bold text-blue-400">{expiryDate.toLocaleDateString()}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-purple-500/20">
          <span className="text-cyan-300 font-medium">Cost</span>
          <span className="font-bold text-cyan-400">{SUBSCRIPTION_FEE} SOL / 30d</span>
        </div>
      </div>

      <button
        onClick={handlePaySubscription}
        disabled={loading}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-green-500/50 transition-all transform hover:scale-105 disabled:scale-100"
      >
        {loading ? "Processing..." : isActive ? "Extend Subscription" : "Pay Subscription"}
      </button>
    </div>
  );
}
