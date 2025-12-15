"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { getSubscriptionPDA, getExtraAccountMetaListPDA } from "@/lib/anchor";
import { PROGRAM_ID } from "@/lib/constants";

export function TokenTransfer({ mintAddress }: { mintAddress?: string }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !mintAddress) return;
    if (!recipient || !amount) {
      alert("Please enter recipient and amount");
      return;
    }

    setLoading(true);
    try {
      const mint = new PublicKey(mintAddress);
      const recipientPubkey = new PublicKey(recipient);
      
      // Get token accounts (you'll need to implement getAssociatedTokenAddress)
      const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
      
      const sourceAccount = getAssociatedTokenAddressSync(
        mint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const destinationAccount = getAssociatedTokenAddressSync(
        mint,
        recipientPubkey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Create transfer instruction
      const transferInstruction = createTransferCheckedInstruction(
        sourceAccount,
        mint,
        destinationAccount,
        wallet.publicKey,
        BigInt(parseFloat(amount) * 1e9),
        9,
        [],
        TOKEN_2022_PROGRAM_ID
      );

      // Add extra accounts for transfer hook
      const [extraAccountMetaListPDA] = getExtraAccountMetaListPDA(mint);
      const [subscriptionPDA] = getSubscriptionPDA(wallet.publicKey);

      transferInstruction.keys.push(
        { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
        { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: subscriptionPDA, isSigner: false, isWritable: false }
      );

      const transaction = new Transaction().add(transferInstruction);
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await wallet.signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(txid);

      alert(`Transfer successful! Transaction: ${txid}`);
      setRecipient("");
      setAmount("");
    } catch (error: any) {
      console.error("Transfer error:", error);
      if (error.message?.includes("SubscriptionExpired") || error.message?.includes("0x1770")) {
        alert("Transfer failed: Your subscription has expired. Please renew to transfer tokens.");
      } else {
        alert(`Transfer failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.connected) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Transfer Tokens
        </h2>
      </div>
      
      {!mintAddress ? (
        <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-blue-500/20">
          <p className="text-cyan-300">Mint address not configured</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter recipient public key"
              className="w-full bg-slate-800/80 border border-purple-500/30 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all text-white placeholder-purple-400/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.1"
              className="w-full bg-slate-800/80 border border-purple-500/30 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all text-white placeholder-purple-400/50"
            />
          </div>

          <button
            onClick={handleTransfer}
            disabled={loading || !recipient || !amount}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-105 disabled:scale-100"
          >
            {loading ? "Transferring..." : "Transfer Tokens"}
          </button>

          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <p className="text-sm text-orange-300 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Active subscription required to transfer
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
