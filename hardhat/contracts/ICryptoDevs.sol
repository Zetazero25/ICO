// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface ICryptoDevs {
    /*
    Returns token ID owned by owner at given index of token list
     Use with {balanceOf} to enumerate all of owner's tokens
     */
    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256 tokenId);

    /*
     Return number of tokens in owner's account.
     */
    function balanceOf(address owner) external view returns (uint256 balance);
}