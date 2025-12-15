import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import idl from "../../target/idl/subscription.json";
import { Subscription } from "../../target/types/subscription";

export function getProgram(connection: Connection, wallet: any): Program<Subscription> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(idl as any, provider);
}

export function getSubscriptionPDA(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getExtraAccountMetaListPDA(mintPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mintPubkey.toBuffer()],
    PROGRAM_ID
  );
}
