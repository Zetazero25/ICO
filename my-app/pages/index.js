import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  // Create a BigNumber
  const zero = BigNumber.from(0);
  // walletConnected track of if the user's wallet is connected
  const [walletConnected, setWalletConnected] = useState(false);
  // loading set to true when waiting for a transaction to be mined
  const [loading, setLoading] = useState(false);
  // tokensToBeClaimed tracks the number of tokens that can be claimed
  // based on the Crypto Dev NFTs held by the user
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  // balanceOfCryptoDevTokens tracks number of Crypto Dev tokens owned by an address
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(
    zero
  );
  // amount of tokens the user wants to mint
  const [tokenAmount, setTokenAmount] = useState(zero);
  // tokensMinted is total number of tokens that have been minted until now out of 10000
  const [tokensMinted, setTokensMinted] = useState(zero);
  // Create a reference to the Web3 Modal (used for connecting to Metamask)
  const web3ModalRef = useRef();

  /*
   getTokensToBeClaimed: checks balance of tokens that can be claimed by user
   */
  const getTokensToBeClaimed = async () => {
    try {
      // Get the provider from web3Modal (no need for the Signer here- are only reading state from the blockchain)
      const provider = await getProviderOrSigner();
      // instance of NFT Contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      //instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // signer extracts the address of the connected MetaMask account
      const signer = await getProviderOrSigner(true);
      // get the address associated to the signer
      const address = await signer.getAddress();
      // call the balanceOf from the NFT contract, get the number of NFTs held by user
      const balance = await nftContract.balanceOf(address);
      // balance is a Big number , compare it with Big Number '0'
      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        // amount keeps track of of unclaimed tokens
        var amount = 0;
        /* For all  NFTs check if tokens have already been claimed
         only increase  amount if tokens have not been claimed
         for a an NFT*/
        for (var i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount++;
          }
        }
        //tokensToBeClaimed is initialized to a Big Number
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  };

  /*
  getBalanceOfCryptoDevTokens: checks balance Crypto Dev Tokens's held by an address
   */
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      // Get the provider from web3Modal (No need for the Signer here: READ ONLY state)
      const provider = await getProviderOrSigner();
      // instace of token contract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // signer extracts the address of the connected MetaMask account
      const signer = await getProviderOrSigner(true);
      // get the address associated to the signer 
      const address = await signer.getAddress();
      // call the balanceOf from token contract to get number of tokens held by user
      const balance = await tokenContract.balanceOf(address);
      // balance is a big number
      setBalanceOfCryptoDevTokens(balance);
    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero);
    }
  };

  /*
   mintCryptoDevToken: mints a given number of tokens to a given address
   */
  const mintCryptoDevToken = async (amount) => {
    try {
      // we need a Signer here because this is a 'write' transaction.
      // instance of tokenContract
      const signer = await getProviderOrSigner(true);
      // instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      // Each token is of 0.0001 ether. value needed to send is `0.0001 * amount`
      const value = 0.0001 * amount;
      const tx = await tokenContract.mint(amount, {
        // value is the cost of one crypto dev token which = "0.0001" eth
        // parsing 0.0001 string to ether using utils library from ethers.js
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      // wait for transaction to be mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully minted Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /*
   claimCryptoDevTokens: Helps user claim Crypto Dev Tokens
   */
  const claimCryptoDevTokens = async () => {
    try {
      // need a Signer because this is a write transaction.
      // instance of tokenContract
      const signer = await getProviderOrSigner(true);
      //instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const tx = await tokenContract.claim();
      setLoading(true);
      // wait for the transaction to be mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully claimed Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /*
   * getTotalTokensMinted: Retrieves how many tokens have been minted until now
   */
  const getTotalTokensMinted = async () => {
    try {
      // get the provider from web3Modal (No need for the Signer here: READ ONLY)
      const provider = await getProviderOrSigner();
      //instance of token contract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // Get all tokens that have been minted
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  };
  /** 
   * @param {*} needSigner: True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // if user is not connected to Rinkeby network, send error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  
        //connectWallet: Connects the MetaMask wallet
      
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // useEffects are used to react to changes in state of the website
  // whenever value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal
    if (!walletConnected) {
      // Assign  Web3Modal class to reference object by setting it's current value
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
    }
  }, [walletConnected]);

  
        //renderButton: Returns a button based on state of the dapp
  const renderButton = () => {
    // If we are currently waiting, return  loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // If tokens claimed are greater than '0', Return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }
    // If user doesn't have tokens to claim, display mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts `e.target.value` to BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to CryptoDevs Portfolio ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps when  converting a BigNumber to a string */}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto
                Dev Portfolio Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps when  converting a BigNumber to a string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Justice
      </footer>
    </div>
  );
}
