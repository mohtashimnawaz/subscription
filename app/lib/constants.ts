import { PublicKey } from "@solana/web3.js";

// Program ID from your Anchor program
export const PROGRAM_ID = new PublicKey("5tLcC7qmenarVTNEdZ3UnDUNysdSQhhaq21ehsVtjyia");

// Subscription constants
export const SUBSCRIPTION_FEE = 0.01; // 0.01 SOL
export const SUBSCRIPTION_DURATION_DAYS = 30;

// RPC endpoint - use localhost for development
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || "http://127.0.0.1:8899";
