import { chainConfigs, TOKEN_DECIMALS } from "./constants";
import { ethers } from "ethers";
import { DEX_ABI } from "./abi/dex-abi";
import { erc20Abi } from "viem";

// Helper function to get ethers provider and signer
const getProviderAndSigner = async () => {
  if (typeof window.ethereum === "undefined" || !window.ethereum.isMetaMask) {
    throw new Error("MetaMask is not installed");
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  } catch (error) {
    throw new Error("User denied account access");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
};

// Convert cNGN amount to the correct decimals (18 decimals)
const parseCNGNAmount = (amount: string) => {
  return ethers.parseUnits(amount, TOKEN_DECIMALS);
};

// Add this helper function to ensure the wallet is on the correct network
const ensureCorrectNetwork = async (chainId = 1): Promise<boolean> => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const chainIdHex = await window.ethereum.request({
    method: "eth_chainId",
  });
  const currentChainId = Number.parseInt(chainIdHex, 16);

  if (currentChainId !== chainId) {
    // Prompt the user to switch networks
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if ((switchError as { code: number }).code === 4902) {
        try {
          const network = chainConfigs[chainId];
          if (!network) {
            throw new Error(
              `Network configuration not found for chain ID ${chainId}`
            );
          }

          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });

          // After adding the network, try to switch to it again
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          });

          return true;
        } catch (addError) {
          console.error("Error adding network:", addError);
          throw new Error(
            `Failed to add network: ${
              addError instanceof Error ? addError.message : "Unknown error"
            }`
          );
        }
      } else {
        throw new Error(
          `Please switch your wallet to ${
            chainConfigs[chainId]?.name || "the correct"
          } network to continue`
        );
      }
    }
  }

  return true;
};

// Approve cNGN to be spent by the DEX contract
export const approveCNGN = async (
  amount: string,
  chainId = 1
): Promise<string> => {
  try {
    // Ensure wallet is on the correct network
    await ensureCorrectNetwork(chainId);

    const { signer } = await getProviderAndSigner();
    const tokenAddress = chainConfigs[chainId]?.tokenAddress;
    const cngnContract = new ethers.Contract(tokenAddress, erc20Abi, signer);

    const contractAddress =
      chainConfigs[chainId]?.contractAddress ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const parsedAmount = parseCNGNAmount(amount);
    const tx = await cngnContract.approve(contractAddress, parsedAmount);

    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Error approving cNGN:", error);
    throw new Error(
      (error as { message: string }).message || "Failed to approve cNGN"
    );
  }
};

// Withdraw USDC from the DEX contract
export const withdrawUSDC = async (
  amount: string,
  chainId = 1
): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner();
    const contractAddress =
      chainConfigs[chainId]?.contractAddress ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("Contract address not found");
    }

    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer);

    const parsedAmount = parseCNGNAmount(amount);
    const tx = await dexContract.withdraw(parsedAmount);

    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Error withdrawing USDC:", error);
    throw new Error(
      (error as { message: string }).message || "Failed to withdraw USDC"
    );
  }
};

// Bridge cNGN to another chain
export const bridgeCNGN = async (
  amount: string,
  destinationChainId: number,
  sourceChainId = 1
): Promise<string> => {
  try {
    // Ensure wallet is on the correct network
    await ensureCorrectNetwork(sourceChainId);

    const { signer } = await getProviderAndSigner();
    const contractAddress =
      chainConfigs[sourceChainId]?.contractAddress ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("Contract address not found");
    }

    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer);

    // Generate a unique bridge ID
    const bridgeId = ethers.randomBytes(32);

    const parsedAmount = parseCNGNAmount(amount);
    const tx = await dexContract.bridgeFrom(
      parsedAmount,
      destinationChainId,
      bridgeId
    );

    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Error bridging cNGN:", error);
    throw new Error(
      (error as { message: string }).message || "Failed to bridge cNGN"
    );
  }
};

// Mint tokens after confirmed deposit
export const mintTokens = async (
  amount: string,
  chainId = 1
): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner();
    const contractAddress =
      chainConfigs[chainId]?.contractAddress ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("Contract address not found");
    }

    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer);

    // Call your contract's function to mint tokens
    const tx = await dexContract.mintTokens(amount);
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error("Error minting tokens:", error);
    throw new Error((error as { message: string }).message || "Failed to mint tokens");
  }
};

// Approve tokens to be spent by the contract
export const approveTokens = async (
  amount: string,
  chainId = 1
): Promise<string> => {
  try {
    const { signer } = await getProviderAndSigner();
    const tokenAddress = chainConfigs[chainId]?.tokenAddress;
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);

    const contractAddress =
      chainConfigs[chainId]?.contractAddress ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const parsedAmount = parseCNGNAmount(amount);
    const tx = await tokenContract.approve(contractAddress, parsedAmount);
    await tx.wait();

    return tx.hash;
  } catch (error) {
    console.error("Error approving tokens:", error);
    throw new Error((error as { message: string }).message || "Failed to approve tokens");
  }
};

// Burn tokens and initiate fiat transfer
export const burnTokens = async (
  amount: string,
  chainId = 1
): Promise<string> => {
  try {
    // Ensure wallet is on the correct network
    await ensureCorrectNetwork(chainId);

    const { signer } = await getProviderAndSigner();
    const contractAddress =
      chainConfigs[chainId]?.contractAddress ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("Contract address not found");
    }
  
    const dexContract = new ethers.Contract(contractAddress, DEX_ABI, signer);

    // Generate a unique offramp ID
    const offRampId = ethers.randomBytes(32);

    // Call your contract's function to burn tokens and initiate fiat transfer
    const tx = await dexContract.withdraw(parseCNGNAmount(amount), offRampId);

    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error("Error burning tokens:", error);
    throw new Error((error as { message: string }).message || "Failed to burn tokens");
  }
};
