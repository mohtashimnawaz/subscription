use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};
use anchor_spl::token_interface::{Mint, TokenAccount};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};

declare_id!("5tLcC7qmenarVTNEdZ3UnDUNysdSQhhaq21ehsVtjyia");

const SUBSCRIPTION_FEE: u64 = 10_000_000; // 0.01 SOL
const SUBSCRIPTION_DURATION: i64 = 30 * 24 * 60 * 60; // 30 days in seconds

#[program]
pub mod subscription {
    use super::*;

    /// Initialize the extra account metas account (required for transfer hooks)
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        // Define the extra accounts that the Token Program should pass to our transfer hook
        let account_metas = vec![
            // The sender's subscription account (PDA)
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal {
                        bytes: b"subscription".to_vec(),
                    },
                    Seed::AccountKey { index: 3 }, // Index 3 = owner (the sender)
                ],
                false, // is_signer
                false, // is_writable
            )?,
        ];

        // Get the account size
        let account_size = ExtraAccountMetaList::size_of(account_metas.len())?;
        
        // Resize the account if needed
        let extra_account_metas_info = &ctx.accounts.extra_account_meta_list.to_account_info();
        let lamports = Rent::get()?.minimum_balance(account_size);
        
        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.bumps.extra_account_meta_list;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"extra-account-metas",
            mint_key.as_ref(),
            &[bump],
        ]];
        
        if extra_account_metas_info.data_len() == 0 {
            // Account hasn't been initialized yet
            let cpi_accounts = Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: extra_account_metas_info.clone(),
            };
            let cpi_program = ctx.accounts.system_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            transfer(cpi_ctx, lamports)?;
            
            // Allocate space
            anchor_lang::system_program::allocate(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Allocate {
                        account_to_allocate: extra_account_metas_info.clone(),
                    },
                    signer_seeds,
                ),
                account_size as u64,
            )?;
            
            // Assign to our program
            anchor_lang::system_program::assign(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Assign {
                        account_to_assign: extra_account_metas_info.clone(),
                    },
                    signer_seeds,
                ),
                &crate::ID,
            )?;
        }

        // Initialize the extra account meta list
        let mut data = extra_account_metas_info.try_borrow_mut_data()?;
        ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &account_metas)?;

        msg!("Extra account meta list initialized");
        Ok(())
    }

    /// Initialize a user's subscription account
    pub fn initialize_subscription(ctx: Context<InitializeSubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription_account;
        subscription.owner = ctx.accounts.owner.key();
        subscription.expiry_timestamp = 0; // No active subscription yet
        
        msg!("Subscription account initialized for {}", subscription.owner);
        Ok(())
    }

    /// Pay for a subscription (extends expiry by 30 days)
    pub fn pay_subscription(ctx: Context<PaySubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription_account;
        let clock = Clock::get()?;
        
        // Transfer SOL from user to treasury (or just burn it for demo)
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, SUBSCRIPTION_FEE)?;

        // Extend subscription
        let current_expiry = subscription.expiry_timestamp;
        let now = clock.unix_timestamp;
        
        // If subscription is already active and not expired, extend from current expiry
        // Otherwise, start from now
        subscription.expiry_timestamp = if current_expiry > now {
            current_expiry + SUBSCRIPTION_DURATION
        } else {
            now + SUBSCRIPTION_DURATION
        };

        msg!(
            "Subscription paid! New expiry: {}",
            subscription.expiry_timestamp
        );
        Ok(())
    }

    /// Transfer hook instruction (called by Token Program during transfers)
    pub fn transfer_hook(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
        let subscription = &ctx.accounts.subscription_account;
        let clock = Clock::get()?;
        
        msg!("Transfer hook called");
        msg!("Sender: {}", subscription.owner);
        msg!("Current time: {}", clock.unix_timestamp);
        msg!("Subscription expiry: {}", subscription.expiry_timestamp);

        // Check if subscription is valid
        require!(
            clock.unix_timestamp < subscription.expiry_timestamp,
            SubscriptionError::SubscriptionExpired
        );

        msg!("Subscription valid! Transfer approved.");
        Ok(())
    }

    // Fallback instruction handler to receive CPI calls from Token Program
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;

        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();

                // Manually invoke the transfer_hook instruction
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}

// Accounts for initializing the extra account meta list
#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The extra account meta list account
    /// CHECK: This account is manually initialized
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

// Accounts for initializing a subscription
#[derive(Accounts)]
pub struct InitializeSubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: The owner of the subscription (wallet that will send tokens)
    pub owner: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + SubscriptionAccount::INIT_SPACE,
        seeds = [b"subscription", owner.key().as_ref()],
        bump
    )]
    pub subscription_account: Account<'info, SubscriptionAccount>,

    pub system_program: Program<'info, System>,
}

// Accounts for paying subscription
#[derive(Accounts)]
pub struct PaySubscription<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"subscription", payer.key().as_ref()],
        bump
    )]
    pub subscription_account: Account<'info, SubscriptionAccount>,

    /// CHECK: Treasury account to receive subscription fees
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// Accounts for the transfer hook
#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(
        token::mint = mint,
        token::authority = owner,
    )]
    pub source_token: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        token::mint = mint,
    )]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: The owner of the source token account
    pub owner: UncheckedAccount<'info>,

    /// CHECK: The extra account meta list
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    #[account(
        seeds = [b"subscription", owner.key().as_ref()],
        bump
    )]
    pub subscription_account: Account<'info, SubscriptionAccount>,
}

// Subscription account data structure
#[account]
#[derive(InitSpace)]
pub struct SubscriptionAccount {
    pub owner: Pubkey,
    pub expiry_timestamp: i64,
}

// Custom errors
#[error_code]
pub enum SubscriptionError {
    #[msg("Subscription has expired. Please renew to transfer tokens.")]
    SubscriptionExpired,
}

