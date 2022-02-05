import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";
import { useRouter } from "next/router";
import Web3Modal from "web3modal";
import QRCode from "qrcode";

const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");

import { nftaddress, nftmarketaddress } from "../config";

import NFT from "../artifacts/contracts/NFT.sol/NFT.json";
import Market from "../artifacts/contracts/Market.sol/NFTMarket.json";

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, updateFormInput] = useState({
    price: "",
    name: "",
    description: "",
  });
  const router = useRouter();
  useEffect(() => {
    async function generateQR() {
      const file = await QRCode.toString("ahoooy");
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
  }, []);

  async function createMarket() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
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
    router.push("/");
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        {fileUrl && (
          <img className="rounded mt-4" src={fileUrl} alt="NFT Image" />
        )}
        <button
          onClick={createMarket}
          className="font-bold mt-4 bg-sky-500 text-white rounded p-4 shadow-lg"
        >
          Create Digital Asset
        </button>
      </div>
      {/*       <img
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHQAAAB0CAYAAABUmhYnAAAEtElEQVR4Xu2dy27jMBAE4///6N3F3iQDKRR6qNBM50pqOOyaByk7yevPv5+v/hyjwKtAj2H5fyMFehbPAj2MZ4EW6GkKHLaf9tACPUyBw7bTDC3QwxQ4bDvN0AI9TIHDttMMLdDDFDhsO83QAj1MgcO2E2fo6/V6VJLpj2/v/t/tf9r+CvQWkAXaDB2tUGkFaoY2Q68BST0oDV9rP+15VHLTDLrrYfdHeo5n6E9vuEBDAtMRlkZwgRboJYZacocPFVbQNCPvFWH1+tY+9cy3ipZ+L5dKrhXcbtjaJ4FWr2/tk78FCgpZwW1AWfsFahW4zbeCF+jiDKEzHgEo0M0ORQVKCkBG7XYoou00QwtU3VOphduSTvZ6yl3cwwlAgQ736GnBqYSnLy7I32ZoM/R7BXY7FNmITjPo12VoKrANGDrl2k9zaP3V+7P2P/7z0FRwep7GreA2oKz9ApWHLlsBCMh0wBRogV5jzh4KKGJp3N7jKAPsOPmXjqcVYDxD0w3R8wUKt47pD7gJSDpeoAV6USANiDQg6fkfL7nk4Opx6uEEkF4srPZ/2n7cQ6cdsvYK9HZITXuoBTA9v0AL9NuYSnvYdMBae3HJffoeNy34p/v/9ioxLbmfLsin+1+gNwUK9DBBChS6NAn0ViLgN8DpHkk9lfyhcfKX1qdDjV0f7aU9NN1weu0gQUkwGk/3hwDg0x56fryHphsu0OtfkaEAJcDxtaVAs/+SYivE40AtYMpQ+641tWcFpvnkT5qRy0tugV4ztkChplBEk4CU8ZRx0wFL+6ES2wy9KfD0tYgCygIcB2ozwjpsBSd/0owg++n+7PMFGv7vvgINQ64Z6gSM76HTEUs9hg4t5E9LLgQICeji6+uLMnIaOK1HAUABZvefzt8uQ0ngAv0eeYHeDkk24+z8NAPp+QItUIqRZ8ene7j1nlrE0z04zlArwPT8Ar0qWqBhhDVDQwHp5fiweTR3HNCnSx71JCRwm0CnVNqfBUrrWf8/7l0u3TtjAeRvcJM/BIzG4/2kXxKjCE4dJAFT+yQw7a8ZGhJoyX34TdFPC07rU8ZRvKX2bUaTP8t7KG1YOyh7HK1foECAepAFSNeSNMILtEAvCqQVIA1ISpD4TRFlqM0Iu2G7vrVPFcOewslfAkbjBSp/t4QC1GYwzSeAjx+KSACKcIro1ePNUPh8kSLOlsQCvSp6XMmljKeMsyWQKpC1RwFP4wUqeygFhA0oAmTHC7RAbzVbvsmhiEt7qM0Q6sHkb0suKDQNlIDY9cheGiBkn8aPL7kkQIHeFKKIpJJEJXLafroeBQj5S8+n483Q8Hu5dOo97toSR5w8hVJFmBaY1qOKkOrzFlDTX0FZLRjZJ4HpeSswrVegskdTyVstaIHKFLCHDBK4GQoASEDJD6fTNQMN3CaQPQqANODIvt3P+CnXOmDnE4BpeyR4gVrFZUZZ8xQgBWoVlfMJgDSHfwLg1wG1Anb+WgXiHrrWvVq3ChSoVWzz+QW6OSDrXoFaxTafX6CbA7LuFahVbPP5Bbo5IOtegVrFNp9foJsDsu4VqFVs8/kFujkg616BWsU2n1+gmwOy7hWoVWzz+QW6OSDr3l/fJhsOpc0NJQAAAABJRU5ErkJggg=="
        alt="NFT Image"
      /> */}
    </div>
  );
}
