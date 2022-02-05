// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract Market is ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;

    struct Item {
        uint itemId;
        address nftAddress;
        uint tokenId;
        address owner;
    }

    struct nftItem {
        uint currentItemId;
        uint tokenId;
        address owner;
    }

    event createItem(
        uint indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address owner
    );

    mapping(uint => Item) private items;
    mapping(address => nftItem) private nftItems;


    function deposit(address _nftAddress, uint _tokenId) external payable nonReentrant {
        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _tokenId);
        _itemIds.increment();
        uint256 itemId = _itemIds.current();

        items[itemId] = Item(itemId, _nftAddress, _tokenId, msg.sender);
        nftItems[_nftAddress] = nftItem(itemId, _tokenId, msg.sender);
        
        emit createItem(
            itemId,
            _nftAddress,
            _tokenId,
            msg.sender
        );
    }


    function sendNft(address _nftAddress, address _receiver) external payable nonReentrant {
        require(nftItems[_nftAddress].owner == msg.sender);

        uint currentTokenId = nftItems[_nftAddress].tokenId;
        uint itemId = nftItems[_nftAddress].currentItemId;

        IERC721(_nftAddress).transferFrom(address(this), _receiver, currentTokenId);

        nftItems[_nftAddress].owner = _receiver;
        items[itemId].owner = _receiver;
    }


    function fetch() public view returns (Item[] memory) {
        uint totalItemCount = _itemIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        for (uint i = 0; i < totalItemCount; i++) {
            if (items[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }

        Item[] memory totalItems = new Item[](itemCount);
        for (uint i = 0; i < totalItemCount; i++) {
            if (items[i + 1].owner == msg.sender) {
                uint currentId = i + 1;
                Item storage currentItem = items[currentId];
                totalItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return totalItems;
    }

}