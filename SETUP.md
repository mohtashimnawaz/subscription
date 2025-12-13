# Subscription Token with Transfer Hook - Setup Guide

## Project Overview

This project implements a Solana Token-2022 with a Transfer Hook that enforces subscription-based transfers. Users can only transfer tokens if they have an active subscription.

## Architecture

```
subscription/
├── programs/subscription/
│   └── src/lib.rs          # Main program with transfer hook logic
├── tests/subscription.ts    # Comprehensive test suite
└── Cargo.toml              # Dependencies
```

## Key Features

1. **Transfer Hook**: Validates subscription before allowing token transfers
2. **Subscription Payment**: Users pay SOL to extend their subscription by 30 days
3. **PDA-based State**: Subscription data stored in PDAs seeded by user wallet
4. **Extra Account Metas**: Properly configured for Token-2022 hook interface

## Dependency Issues & Solution

The current Solana/SPL ecosystem has dependency conflicts between different crate versions. Here's the recommended approach:

### Option 1: Use Anchor 0.30.x (Recommended for Production)

```toml
[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
spl-token-2022 = "3.0"
spl-transfer-hook-interface = "0.6"
spl-tlv-account-resolution = "0.6"
spl-type-length-value = "0.4"
```

### Option 2: Wait for Anchor 0.32+ with better Token-2022 support

The Anchor framework is actively being updated to better support Token-2022 extensions.

## Quick Start (Using the provided code)

### Step 1: Fix Dependencies

Edit `programs/subscription/Cargo.toml`:

```toml
[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
```

Then update Anchor CLI:
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli
```

### Step 2: Install npm dependencies

```bash
npm install
```

### Step 3: Build

```bash
anchor build
```

### Step 4: Update Program ID

After first build, update the program ID in:
- `lib.rs` (declare_id!)
- `Anchor.toml`

### Step 5: Test

```bash
anchor test
```

## Program Instructions

### 1. `initialize_extra_account_meta_list`
- Sets up the extra accounts needed for the transfer hook
- Must be called once per mint
- Seeds: `["extra-account-metas", mint]`

### 2. `initialize_subscription`
- Creates a subscription account for a user
- Seeds: `["subscription", user_wallet]`
- Initial expiry: 0 (no active subscription)

### 3. `pay_subscription`
- User pays 0.01 SOL to extend subscription by 30 days
- Extends from current expiry if still valid, otherwise from now

### 4. `transfer_hook`
- Called automatically by Token Program during transfers
- Checks if sender's subscription is valid
- Fails with `SubscriptionExpired` error if not valid

## Test Flow

1. ✅ Create Token-2022 mint with TransferHook extension
2. ✅ Initialize extra account meta list
3. ✅ Create token accounts for User A and B
4. ✅ Mint tokens to User A
5. ✅ Initialize User A's subscription account
6. ❌ Try transfer (FAILS - no subscription)
7. ✅ Pay for subscription
8. ✅ Try transfer (SUCCESS - has subscription)
9. ✅ Extend subscription

## Architecture Details

### PDA Seeds

- **Extra Account Metas**: `["extra-account-metas", mint_pubkey]`
- **Subscription Account**: `["subscription", user_wallet_pubkey]`

### Subscription Account Structure

```rust
pub struct SubscriptionAccount {
    pub owner: Pubkey,           // 32 bytes
    pub expiry_timestamp: i64,   // 8 bytes
}
```

### Transfer Hook Flow

```
Token Transfer Initiated
    ↓
Token Program calls transfer_hook via CPI
    ↓
Hook reads sender's SubscriptionAccount
    ↓
Checks: current_time < expiry_timestamp?
    ├─ Yes → Allow transfer
    └─ No  → Fail with SubscriptionExpired error
```

## Troubleshooting

### Dependency Conflicts

If you see conflicts with `zeroize`, `base64ct`, or other transitive dependencies:

1. Clear cargo cache: `rm -rf ~/.cargo/registry/cache`
2. Use exact versions (not `^` semver)
3. Consider using Anchor 0.30.1 which has proven compatibility

### Runtime Errors

- **"Subscription Expired"**: User needs to call `pay_subscription`
- **"Account not initialized"**: Call `initialize_subscription` first
- **"Invalid account data"**: Ensure PDAs are derived correctly

## Production Considerations

1. **Subscription Price**: Currently hardcoded to 0.01 SOL
2. **Duration**: Currently 30 days (2,592,000 seconds)
3. **Treasury**: Configure a proper treasury wallet
4. **Access Control**: Add admin controls for configuration changes
5. **Upgrades**: Implement subscription renewal discounts
6. **Grace Period**: Consider adding a grace period before strict enforcement

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [SPL Token-2022 Guide](https://spl.solana.com/token-2022)
- [Transfer Hook Interface](https://github.com/solana-labs/solana-program-library/tree/master/token/transfer-hook/interface)
