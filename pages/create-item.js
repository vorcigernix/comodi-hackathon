import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";
import { useRouter } from "next/router";
import Web3Modal from "web3modal";
import QRCode from "qrcode";

const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");

import { nftaddress, nftmarketaddress } from "../config";

import NFT from "../artifacts/contracts/NFT.sol/NFT.json";
import Market from "../artifacts/contracts/Market.sol/Market.json";
import { formatUnits } from "ethers/lib/utils";

let rpcEndpoint = null;

if (process.env.NEXT_PUBLIC_WORKSPACE_URL) {
  rpcEndpoint = process.env.NEXT_PUBLIC_WORKSPACE_URL;
}

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, updateFormInput] = useState({
    price: "",
    name: "",
    description: "",
    sku: "L Bags",
    qty: "",
    mnemonic: "",
  });
  const [ethPrice, setEthPrice] = useState(0);
  const router = useRouter();
  function getEthPrice() {
    const priceProvider = new ethers.providers.JsonRpcProvider(
      "https://kovan.infura.io/v3/f0671e059fde4ab1a541db0a8ea9aa1d"
    );
    const aggregatorV3InterfaceABI = [
      {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "description",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ internalType: "uint80", name: "_roundId", type: "uint80" }],
        name: "getRoundData",
        outputs: [
          { internalType: "uint80", name: "roundId", type: "uint80" },
          { internalType: "int256", name: "answer", type: "int256" },
          { internalType: "uint256", name: "startedAt", type: "uint256" },
          { internalType: "uint256", name: "updatedAt", type: "uint256" },
          { internalType: "uint80", name: "answeredInRound", type: "uint80" },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "latestRoundData",
        outputs: [
          { internalType: "uint80", name: "roundId", type: "uint80" },
          { internalType: "int256", name: "answer", type: "int256" },
          { internalType: "uint256", name: "startedAt", type: "uint256" },
          { internalType: "uint256", name: "updatedAt", type: "uint256" },
          { internalType: "uint80", name: "answeredInRound", type: "uint80" },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "version",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ];
    const addr = "0x9326BFA02ADD2366b30bacB125260Af641031331";
    const priceFeed = new ethers.Contract(
      addr,
      aggregatorV3InterfaceABI,
      priceProvider
    );
    priceFeed.latestRoundData().then((roundData) => {
      let price = formatUnits(ethers.BigNumber.from(roundData.answer), 0) / 1e8;

      //console.log(price);
      setEthPrice(price);
    });
  }
  useEffect(() => {
    async function generateQR() {
      const qrmnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
      updateFormInput({ ...formInput, mnemonic: qrmnemonic });
      const file = await QRCode.toString(qrmnemonic);
      try {
        const added = await client.add(file, {
          progress: (prog) => console.log(`received: ${prog}`),
        });
        const url = `https://ipfs.infura.io/ipfs/${added.path}`;
        setFileUrl(url);
      } catch (error) {
        console.log("Error uploading file: ", error);
      }
    }
    generateQR();
    getEthPrice();
  }, []);

  async function createMarket() {
    const { name, description, price, sku, qty, mnemonic } = formInput;
    console.log(name, description, price);
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
      sku,
      qty,
      mnemonic,
    });
    try {
      const added = await client.add(data);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
      createSale(url);
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }

  async function createSale(url) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    /* next, create the item */
    let contract = new ethers.Contract(nftaddress, NFT.abi, signer);
    let transaction = await contract.createToken(url);
    let tx = await transaction.wait();
    let event = tx.events[0];
    let value = event.args[2];
    let tokenId = value.toNumber();

    const price = ethers.utils.parseUnits(formInput.price, "ether");

    /* then list the item for sale on the marketplace */
    contract = new ethers.Contract(nftmarketaddress, Market.abi, signer);
    let listingPrice = await contract.getListingPrice();
    listingPrice = listingPrice.toString();

    transaction = await contract.createMarketItem(nftaddress, tokenId, price, {
      value: listingPrice,
    });
    await transaction.wait();
    router.push("/market");
  }

  return (
    <>
      <section className="text-gray-600 body-font overflow-hidden">
        <div className="container px-5 py-24 mx-auto">
          <div className="lg:w-4/5 mx-auto flex flex-wrap">
            {fileUrl ? (
              <img
                className="lg:w-1/2 w-full lg:h-auto h-64 object-cover object-center rounded"
                src={fileUrl}
                alt="QR Code"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="lg:w-1/2 w-full lg:h-auto h-64 object-cover object-center"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M2 9.5A3.5 3.5 0 005.5 13H9v2.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 15.586V13h2.5a4.5 4.5 0 10-.616-8.958 4.002 4.002 0 10-7.753 1.977A3.5 3.5 0 002 9.5zm9 3.5H9V8a1 1 0 012 0v5z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <div className="lg:w-1/2 w-full lg:pl-10 lg:py-6 mt-6 lg:mt-0">
              <h2 className="text-sm title-font text-gray-500 tracking-widest">
                CREATE ORDER
              </h2>
              <h1 className="text-gray-900 text-3xl title-font font-medium mb-5">
                {" "}
                <input
                  placeholder="Asset Name"
                  className="mt-8 border rounded p-4"
                  onChange={(e) =>
                    updateFormInput({ ...formInput, name: e.target.value })
                  }
                />
              </h1>
              <textarea
                placeholder="Asset Description"
                className="mt-2 border rounded p-4 leading-relaxed w-full"
                onChange={(e) =>
                  updateFormInput({ ...formInput, description: e.target.value })
                }
              />
              <div className="flex mt-6 items-center pb-5 border-b-2 border-gray-100 mb-5">
                <div className=" items-center">
                  <span className="mr-3">Quantity</span>
                  <div className="relative">
                    <input
                      placeholder="60"
                      className="border rounded py-2 pl-3 pr-10 w-20"
                      onChange={(e) =>
                        updateFormInput({ ...formInput, qty: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="ml-6 items-center">
                  <span className="mr-3">SKU</span>
                  <div className="relative">
                    <select
                      className="rounded border appearance-none border-gray-300 py-2 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-500 text-base pl-3 pr-10"
                      onChange={(e) =>
                        updateFormInput({ ...formInput, sku: e.target.value })
                      }
                    >
                      <option>Barrel</option>
                      <option>XL Bags</option>
                      <option>L Bags</option>
                    </select>
                    <span className="absolute right-0 top-0 h-full w-10 text-center text-gray-600 pointer-events-none flex items-center justify-center">
                      <svg
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 9l6 6 6-6"></path>
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              <div className="items-center">
                <span className="mr-3">Price in Ethereum</span>
                <div className="relative">
                  <input
                    placeholder="0.1"
                    className="border text-gray-900 text-2xl title-font font-medium w-full rounded py-2 pl-3 "
                    onChange={(e) =>
                      updateFormInput({ ...formInput, price: e.target.value })
                    }
                  />
                </div>
                {formInput.price && (
                  <span className="text-gray-700">
                    Equals ${Math.floor(ethPrice * formInput.price)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-center pb-10">
        <button
          className="inline-flex text-white bg-sky-500 border-0 py-2 px-6 focus:outline-none hover:bg-sky-600 rounded-l text-lg"
          onClick={() => window.print()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
        </button>
        <button
          onClick={createMarket}
          className="inline-flex text-white bg-sky-500 border-0 py-2 px-6 focus:outline-none hover:bg-sky-600 rounded-r text-lg"
        >
          Create Order
        </button>
      </div>
    </>
  );
}
