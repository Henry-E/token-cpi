use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod token_cpi {
    use super::*;
    pub fn transfer_wrapper(ctx: Context<TransferWrapper>, amount: u64) -> ProgramResult {
        msg!("starting tokens: {}", ctx.accounts.sender_token.amount);
        token::transfer(ctx.accounts.transfer_ctx(), amount)?;
        ctx.accounts.sender_token.reload()?;
        msg!("remaining tokens: {}", ctx.accounts.sender_token.amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct TransferWrapper<'info> {
    pub sender: Signer<'info>,
    #[account(mut)]
    pub sender_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub receiver_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

impl<'info> TransferWrapper<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.sender_token.to_account_info(),
                to: self.receiver_token.to_account_info(),
                authority: self.sender.to_account_info(),
            },
        )
    }
}
