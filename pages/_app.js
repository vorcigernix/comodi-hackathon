import "../styles/globals.css";
import Link from "next/link";
import { ethers } from "ethers";
import { useState, useEffect } from "react";

function Marketplace({ Component, pageProps }) {
  const [provider, setProvider] = useState(null);
  useEffect(() => {
    if (window.ethereum) {
      setProvider(new ethers.providers.Web3Provider(window.ethereum));
    }
    //console.log(provider);
  }, []);
  return (
    <div>
      <nav className="border-b p-6">
        <Link href="/" passHref>
          <a className="text-4xl text-sky-700 font-extrabold font-title">
            Comodi
          </a>
        </Link>
        {provider && (
          <div className="flex mt-4">
            <Link href="/market">
              <a className="mr-4 text-sky-500">Market</a>
            </Link>
            <Link href="/create-item">
              <a className="mr-6 text-sky-500">Sell Digital Asset</a>
            </Link>
            <Link href="/my-assets">
              <a className="mr-6 text-sky-500">My Digital Assets</a>
            </Link>
            <Link href="/creator-dashboard">
              <a className="mr-6 text-sky-500">Creator Dashboard</a>
            </Link>
          </div>
        )}
      </nav>
      <Component {...pageProps} />
    </div>
  );
}

export default Marketplace;
