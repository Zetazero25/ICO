  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.10;

  import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
  import "@openzeppelin/contracts/access/Ownable.sol";
  import "./ICryptoDevs.sol";

  contract CryptoDevToken is ERC20, Ownable {
      // Price of one Crypto Dev token
      uint256 public constant tokenPrice = 0.0001 ether;
      // Each NFT gives the user 10 tokens 
      uint256 public constant tokensPerNFT = 10 * 10**18;
      // max total supply is 10000 Crypto Dev Tokens
      uint256 public constant maxTotalSupply = 10000 * 10**18;
      // CryptoDevsNFT contract instance
      ICryptoDevs CryptoDevsNFT;
      // Mapping keeps track of which tokenIds areclaimed
      mapping(uint256 => bool) public tokenIdsClaimed;

      constructor(address _cryptoDevsContract) ERC20("Crypto Dev Token", "CD") {
          CryptoDevsNFT = ICryptoDevs(_cryptoDevsContract);
      }

      /*
        Mints specified amount of CryptoDevTokens
       Requirements: msg.value should be equal or greater than tokenPrice * amount
       */
      function mint(uint256 amount) public payable {
          // value of ether that should be equal or greater than tokenPrice * amount;
          uint256 _requiredAmount = tokenPrice * amount;
          require(msg.value >= _requiredAmount, "Ether sent is incorrect");
          // total tokens + amount <= 10000, if not revert the transaction
          uint256 amountWithDecimals = amount * 10**18;
          require(
              (totalSupply() + amountWithDecimals) <= maxTotalSupply,
              "Exceeds the max total supply available."
          );
          // call the internal function from Openzeppelin's ERC20 contract
          _mint(msg.sender, amountWithDecimals);
      }

      /*
        Mints tokens based on number of NFT's held by sender
        Requirements:
        balance of NFTs owned by sender should be greater than 0
       */
      function claim() public {
          address sender = msg.sender;
          // Get number of NFTs held by the sender address
          uint256 balance = CryptoDevsNFT.balanceOf(sender);
          // If balance is zero revert the transaction
          require(balance > 0, "You dont own any Crypto Dev NFT's");
          // amount tracks the number of unclaimed tokenIds
          uint256 amount = 0;
          // loop over the balance & get token ID owned by sender at a given index of its token list.
          for (uint256 i = 0; i < balance; i++) {
              uint256 tokenId = CryptoDevsNFT.tokenOfOwnerByIndex(sender, i);
              // if tokenId has not been claimed, increase amount
              if (!tokenIdsClaimed[tokenId]) {
                  amount += 1;
                  tokenIdsClaimed[tokenId] = true;
              }
          }
          // if all token Ids have been claimed, revert transaction;
          require(amount > 0, "You have already claimed all the tokens");
          // call  internal function from Openzeppelin's ERC20 contract
          // mint (amount * 10) tokens per NFT
          _mint(msg.sender, amount * tokensPerNFT);
      }

      // Function to receive Ether, msg.data must be empty
      receive() external payable {}

      // Fallback function called when msg.data is not empty
      fallback() external payable {}
  }
