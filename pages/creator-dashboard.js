import { ethers } from "ethers";
import { useEffect, useState } from "react";
import axios from "axios";
import Web3Modal from "web3modal";
import Image from "next/image";

import { nftmarketaddress, nftaddress } from "../config";

import Market from "../artifacts/contracts/Market.sol/Market.json";
import NFT from "../artifacts/contracts/NFT.sol/NFT.json";
import Link from "next/link";

export default function CreatorDashboard() {
  const [nfts, setNfts] = useState([]);
  const [sold, setSold] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");
  useEffect(() => {
    loadNFTs();
  }, []);
  async function loadNFTs() {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const marketContract = new ethers.Contract(
      nftmarketaddress,
      Market.abi,
      signer
    );
    const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider);
    const data = await marketContract.fetchItemsCreated();

    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await tokenContract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenUri);
        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          sold: i.sold,
          image: meta.data.image,
          sku: meta.data.sku,
          qty: meta.data.qty,
          name: meta.data.name,
        };
        return item;
      })
    );
    /* create a filtered array of items that have been sold */
    const soldItems = items.filter((i) => i.sold);
    setSold(soldItems);
    setNfts(items);
    setLoadingState("loaded");
  }
  if (loadingState === "loaded" && !nfts.length)
    return (
      <section className="text-gray-600 body-font">
        <div className="container mx-auto flex px-5 py-24 items-center justify-center flex-col">
          <img
            className="lg:w-2/6 md:w-3/6 w-5/6 mb-10 object-cover object-center rounded"
            alt="hero"
            src="https://images.unsplash.com/photo-1575529673278-45f8a3907e99?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NTJ8fGVtcHR5JTIwdHJvbGxleXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60"
   
          />
          <div className="text-center lg:w-2/3 w-full">
            <h1 className="title-font sm:text-4xl text-3xl mb-4 font-medium text-gray-900">
              No items found
            </h1>
            <p className="mb-8 leading-relaxed">
              You haven&lsquo;t created any orders yet.
            </p>
            <div className="flex justify-center">
              <Link href="/create-item" passHref>
                <button className="inline-flex text-white bg-sky-500 border-0 py-2 px-6 focus:outline-none hover:bg-sky-600 rounded text-lg">
                  Create Order
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  return (
    <>
      <section className="text-gray-600 body-font">
        <div className="container px-5 py-24 mx-auto">
          <h1 className=" font-title text-lg pb-4">Orders Created</h1>
          <div className="flex flex-wrap -m-4">
            {nfts.map((nft, i) => (
              <div key={i} className="lg:w-1/4 md:w-1/2 p-4 w-full">
                <a className="block relative h-48 rounded overflow-hidden">
                  <img
                    alt="ecommerce"
                    className="object-cover object-center w-full h-full block"
                    src="https://source.unsplash.com/random/420x260/?coffee"
                  />
                </a>
                <div className="mt-4">
                  <h3 className="text-gray-500 text-xs tracking-widest title-font mb-1">
                    {nft.description}
                  </h3>
                  <h2 className="text-gray-900 title-font text-lg font-medium">
                    {nft.name}, {nft.qty} of {nft.sku}
                  </h2>
                  <div className="flex">
                    <span className="title-font font-medium text-2xl text-gray-900">
                      Selling for {nft.price}&nbsp;Ξ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {Boolean(sold.length) && (
        <section className="text-gray-600 body-font">
          <div className="container px-5 py-24 mx-auto">
            <h1 className=" font-title text-lg pb-4">Orders Sold</h1>
            <div className="flex flex-wrap -m-4">
              {nfts.map((nft, i) => (
                <div key={i} className="lg:w-1/4 md:w-1/2 p-4 w-full">
                  <a className="block relative h-48 rounded overflow-hidden">
                    <img
                      alt="ecommerce"
                      className="object-cover object-center w-full h-full block"
                      src="https://source.unsplash.com/random/420x260/?coffee"
                    />
                  </a>
                  <div className="mt-4">
                    <h3 className="text-gray-500 text-xs tracking-widest title-font mb-1">
                      {nft.description}
                    </h3>
                    <h2 className="text-gray-900 title-font text-lg font-medium">
                      {nft.name}, {nft.qty} of {nft.sku}
                    </h2>
                    <div className="flex">
                      <span className="title-font font-medium text-2xl text-gray-900">
                        Sold for {nft.price}&nbsp;Ξ
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
