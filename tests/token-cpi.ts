import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { TokenCpi } from '../target/types/token_cpi';
import { clusterApiUrl, Connection, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID, MintLayout, AccountLayout } from "@solana/spl-token";

describe('token-cpi', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.TokenCpi as Program<TokenCpi>;

  let mint;
  let sender_token;
  let receiver;
  let receiver_token;

  it('setup mints and token accounts', async () => {
    mint = Keypair.generate();

    let create_mint_tx = new Transaction().add(
      // create mint account
      SystemProgram.createAccount({
        fromPubkey: program.provider.wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports: await Token.getMinBalanceRentForExemptMint(program.provider.connection),
        programId: TOKEN_PROGRAM_ID,
      }),
      // init mint account
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint pubkey
        6, // decimals
        program.provider.wallet.publicKey, // mint authority
        program.provider.wallet.publicKey // freeze authority (if you don't need it, you can set `null`)
      )
    );

    await program.provider.send(create_mint_tx, [mint]);
    // Add your test here.
    // const tx = await program.rpc.initialize({});
    // console.log("Your transaction signature", tx);
    // console.log(await program.provider.connection.getParsedAccountInfo(mint));
    sender_token = Keypair.generate();
    let create_sender_token_tx = new Transaction().add(
      // create token account
      SystemProgram.createAccount({
        fromPubkey: program.provider.wallet.publicKey,
        newAccountPubkey: sender_token.publicKey,
        space: AccountLayout.span,
        lamports: await Token.getMinBalanceRentForExemptAccount(program.provider.connection),
        programId: TOKEN_PROGRAM_ID,
      }),
      // init mint account
      Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint
        sender_token.publicKey, // token account
        program.provider.wallet.publicKey // owner of token account
      )
    );

    await program.provider.send(create_sender_token_tx, [sender_token]);

    receiver = Keypair.generate();
    receiver_token = Keypair.generate();
    let create_receiver_token_tx = new Transaction().add(
      // create token account
      SystemProgram.createAccount({
        fromPubkey: program.provider.wallet.publicKey,
        newAccountPubkey: receiver_token.publicKey,
        space: AccountLayout.span,
        lamports: await Token.getMinBalanceRentForExemptAccount(program.provider.connection),
        programId: TOKEN_PROGRAM_ID,
      }),
      // init mint account
      Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint
        receiver_token.publicKey, // token account
        receiver.publicKey // owner of token account
      )
    );

    await program.provider.send(create_receiver_token_tx, [receiver_token]);

    let mint_tokens_tx = new Transaction().add(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
        mint.publicKey, // mint
        sender_token.publicKey, // receiver (sholud be a token account)
        program.provider.wallet.publicKey, // mint authority
        [], // only multisig account will use. leave it empty now.
        2e6 // amount. if your decimals is 8, you mint 10^8 for 1 token.
      )
    );

    await program.provider.send(mint_tokens_tx);

    console.log("token balance: ", await program.provider.connection.getTokenAccountBalance(sender_token.publicKey));
  });

  it('transfter wrapper', async () => {
    let amount = new anchor.BN(1e6);
    await program.rpc.transferWrapper(amount, {
      accounts: {
        sender: program.provider.wallet.publicKey,
        senderToken: sender_token.publicKey,
        receiverToken: receiver_token.publicKey,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      }
    })
    console.log("sender token balance: ", await program.provider.connection.getTokenAccountBalance(sender_token.publicKey));
    console.log("receiver token balance: ", await program.provider.connection.getTokenAccountBalance(receiver_token.publicKey));

  })


});
