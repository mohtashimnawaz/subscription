import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Subscription } from "../target/types/subscription";
import {
  ExtensionType,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  createMintToInstruction,
  createTransferCheckedInstruction,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";

describe("Subscription Token with Transfer Hook", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Subscription as Program<Subscription>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  // Test accounts
  let mint: Keypair;
  let userA: Keypair;
  let userB: Keypair;
  let userATokenAccount: PublicKey;
  let userBTokenAccount: PublicKey;
  let extraAccountMetaListPDA: PublicKey;
  let subscriptionAccountPDA: PublicKey;
  let treasury: Keypair;

  const DECIMALS = 9;
  const MINT_AMOUNT = 1_000_000_000; // 1 token

  before(async () => {
    // Generate keypairs
    mint = Keypair.generate();
    userA = Keypair.generate();
    userB = Keypair.generate();
    treasury = Keypair.generate();

    console.log("\n🔑 Generated Keypairs:");
    console.log("Mint:", mint.publicKey.toBase58());
    console.log("User A:", userA.publicKey.toBase58());
    console.log("User B:", userB.publicKey.toBase58());

    // Airdrop SOL to test accounts
    console.log("\n💰 Airdropping SOL...");
    await connection.confirmTransaction(
      await connection.requestAirdrop(userA.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(userB.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(treasury.publicKey, 1 * LAMPORTS_PER_SOL)
    );

    // Derive PDAs
    [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), mint.publicKey.toBuffer()],
      program.programId
    );

    [subscriptionAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("subscription"), userA.publicKey.toBuffer()],
      program.programId
    );

    console.log("\n📍 PDAs:");
    console.log("Extra Account Meta List:", extraAccountMetaListPDA.toBase58());
    console.log("User A Subscription:", subscriptionAccountPDA.toBase58());
  });

  it("Creates a Token-2022 mint with Transfer Hook extension", async () => {
    console.log("\n🏗️  Creating Token-2022 mint with Transfer Hook...");

    const extensions = [ExtensionType.TransferHook];
    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeTransferHookInstruction(
        mint.publicKey,
        wallet.publicKey, // authority
        program.programId, // transfer hook program
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint.publicKey,
        DECIMALS,
        wallet.publicKey, // mint authority
        null, // freeze authority
        TOKEN_2022_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [wallet.payer, mint]);
    console.log("✅ Mint created:", mint.publicKey.toBase58());
  });

  it("Initializes the Extra Account Meta List", async () => {
    console.log("\n📝 Initializing Extra Account Meta List...");

    const tx = await program.methods
      .initializeExtraAccountMetaList()
      .accounts({
        payer: wallet.publicKey,
        extraAccountMetaList: extraAccountMetaListPDA,
        mint: mint.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Extra Account Meta List initialized");
    console.log("Transaction:", tx);
  });

  it("Creates token accounts for User A and User B", async () => {
    console.log("\n💼 Creating token accounts...");

    userATokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      userA.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    userBTokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      userB.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const transaction = new Transaction()
      .add(
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          userATokenAccount,
          userA.publicKey,
          mint.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      )
      .add(
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          userBTokenAccount,
          userB.publicKey,
          mint.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );

    await sendAndConfirmTransaction(connection, transaction, [wallet.payer]);

    console.log("✅ User A Token Account:", userATokenAccount.toBase58());
    console.log("✅ User B Token Account:", userBTokenAccount.toBase58());
  });

  it("Mints tokens to User A", async () => {
    console.log("\n🪙 Minting tokens to User A...");

    const transaction = new Transaction().add(
      createMintToInstruction(
        mint.publicKey,
        userATokenAccount,
        wallet.publicKey,
        MINT_AMOUNT,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [wallet.payer]);

    const tokenAccount = await connection.getTokenAccountBalance(userATokenAccount);
    console.log("✅ User A balance:", tokenAccount.value.uiAmount);
  });

  it("Initializes User A's subscription account", async () => {
    console.log("\n🎫 Initializing User A subscription account...");

    const tx = await program.methods
      .initializeSubscription()
      .accounts({
        payer: userA.publicKey,
        owner: userA.publicKey,
        subscriptionAccount: subscriptionAccountPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([userA])
      .rpc();

    console.log("✅ Subscription account initialized");
    console.log("Transaction:", tx);

    const subscriptionAccount = await program.account.subscriptionAccount.fetch(
      subscriptionAccountPDA
    );
    console.log("Expiry timestamp:", subscriptionAccount.expiryTimestamp.toString());
    expect(subscriptionAccount.expiryTimestamp.toNumber()).to.equal(0);
  });

  it("FAILS to transfer tokens (no active subscription)", async () => {
    console.log("\n❌ Attempting transfer without subscription...");

    try {
      // Create a regular transfer checked instruction
      const transferInstruction = createTransferCheckedInstruction(
        userATokenAccount,
        mint.publicKey,
        userBTokenAccount,
        userA.publicKey,
        BigInt(100_000_000), // 0.1 tokens
        DECIMALS,
        [],
        TOKEN_2022_PROGRAM_ID
      );

      // The Token Program needs these accounts to resolve the transfer hook
      transferInstruction.keys.push(
        { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
        { pubkey: program.programId, isSigner: false, isWritable: false },
        { pubkey: subscriptionAccountPDA, isSigner: false, isWritable: false }
      );

      const transaction = new Transaction().add(transferInstruction);

      await sendAndConfirmTransaction(connection, transaction, [userA]);
      
      // Should not reach here
      throw new Error("Transfer should have failed!");
    } catch (error) {
      console.log("✅ Transfer failed as expected!");
      console.log("Error:", error.message);
      // Check for custom error or generic error
      const isExpiredError = 
        error.message.includes("Subscription has expired") ||
        error.message.includes("0xa261c2c0") ||
        error.message.includes("custom program error");
      expect(isExpiredError).to.be.true;
    }
  });

  it("User A pays for subscription", async () => {
    console.log("\n💳 User A paying for subscription...");

    const balanceBefore = await connection.getBalance(treasury.publicKey);
    console.log("Treasury balance before:", balanceBefore / LAMPORTS_PER_SOL, "SOL");

    const tx = await program.methods
      .paySubscription()
      .accounts({
        payer: userA.publicKey,
        subscriptionAccount: subscriptionAccountPDA,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userA])
      .rpc();

    console.log("✅ Subscription paid!");
    console.log("Transaction:", tx);

    const subscriptionAccount = await program.account.subscriptionAccount.fetch(
      subscriptionAccountPDA
    );
    console.log("New expiry timestamp:", subscriptionAccount.expiryTimestamp.toString());
    
    const currentTime = Math.floor(Date.now() / 1000);
    expect(subscriptionAccount.expiryTimestamp.toNumber()).to.be.greaterThan(currentTime);

    const balanceAfter = await connection.getBalance(treasury.publicKey);
    console.log("Treasury balance after:", balanceAfter / LAMPORTS_PER_SOL, "SOL");
    expect(balanceAfter).to.be.greaterThan(balanceBefore);
  });

  it("SUCCESS: Transfers tokens with active subscription", async () => {
    console.log("\n✅ Attempting transfer with active subscription...");

    const transferAmount = BigInt(100_000_000); // 0.1 tokens

    const balanceBeforeA = await connection.getTokenAccountBalance(userATokenAccount);
    const balanceBeforeB = await connection.getTokenAccountBalance(userBTokenAccount);
    
    console.log("User A balance before:", balanceBeforeA.value.uiAmount);
    console.log("User B balance before:", balanceBeforeB.value.uiAmount);

    // Create a regular transfer checked instruction
    const transferInstruction = createTransferCheckedInstruction(
      userATokenAccount,
      mint.publicKey,
      userBTokenAccount,
      userA.publicKey,
      transferAmount,
      DECIMALS,
      [],
      TOKEN_2022_PROGRAM_ID
    );

    // The Token Program needs these accounts to resolve the transfer hook
    transferInstruction.keys.push(
      { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
      { pubkey: program.programId, isSigner: false, isWritable: false },
      { pubkey: subscriptionAccountPDA, isSigner: false, isWritable: false }
    );

    const transaction = new Transaction().add(transferInstruction);

    const tx = await sendAndConfirmTransaction(connection, transaction, [userA]);
    console.log("✅ Transfer successful!");
    console.log("Transaction:", tx);

    const balanceAfterA = await connection.getTokenAccountBalance(userATokenAccount);
    const balanceAfterB = await connection.getTokenAccountBalance(userBTokenAccount);
    
    console.log("User A balance after:", balanceAfterA.value.uiAmount);
    console.log("User B balance after:", balanceAfterB.value.uiAmount);

    expect(balanceAfterB.value.uiAmount).to.equal(0.1);
  });

  it("Can extend subscription by paying again", async () => {
    console.log("\n🔄 Extending subscription...");

    const accountBefore = await program.account.subscriptionAccount.fetch(
      subscriptionAccountPDA
    );
    const expiryBefore = accountBefore.expiryTimestamp.toNumber();
    console.log("Expiry before:", expiryBefore);

    await program.methods
      .paySubscription()
      .accounts({
        payer: userA.publicKey,
        subscriptionAccount: subscriptionAccountPDA,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userA])
      .rpc();

    const accountAfter = await program.account.subscriptionAccount.fetch(
      subscriptionAccountPDA
    );
    const expiryAfter = accountAfter.expiryTimestamp.toNumber();
    console.log("Expiry after:", expiryAfter);

    console.log("✅ Subscription extended by 30 days!");
    expect(expiryAfter).to.be.greaterThan(expiryBefore);
  });
});

