import { chainConfigs, TOKEN_DECIMALS } from "./constants";
import { createWalletClient, custom, type Hex, parseUnits, toHex } from "viem";
import { DEX_ABI } from "./abi/dex-abi";
import { erc20Abi } from "viem";

// Helper function to create a viem wallet client using MetaMask
const getWalletClient = async (chainId: number) => {
  if (typeof window.ethereum === "undefined" || !window.ethereum.isMetaMask) {
    throw new Error("MetaMask is not installed");
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  } catch (error) {
    throw new Error("User denied account access");
  }

  // Optionally use a viem chain from your chainConfigs if provided.
  const chainConfig = chainConfigs[chainId];

  const walletClient = createWalletClient({
    chain: chainConfig.chain,
    transport: custom(window.ethereum),
  });

  return walletClient;
};

// Convert cNGN amount to the correct decimals (18 decimals) using viem's parseUnits
const parseCNGNAmount = (amount: string) => {
  return parseUnits(amount, TOKEN_DECIMALS);
};

// Helper function to ensure the wallet is on the correct network
const ensureCorrectNetwork = async (chainId = 1): Promise<boolean> => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const chainIdHex = await window.ethereum.request({
    method: "eth_chainId",
  });
  const currentChainId = Number.parseInt(chainIdHex, 16);

  if (currentChainId !== chainId) {
    try {
      // Attempt to switch networks
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (switchError) {
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

          // After adding, try switching again.
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
export const approveTokenSpend = async (
  amount: string,
  chainId = 1
): Promise<string> => {
  try {
    await ensureCorrectNetwork(chainId);

    const walletClient = await getWalletClient(chainId);
    if (!walletClient.account) throw new Error("Account not found");

    const tokenAddress = chainConfigs[chainId].cngnAddress;
    if (!tokenAddress)
      throw new Error("Token address not found in chain configuration");

    const contractAddress =
      chainConfigs[chainId]?.contractAddress
    if (!contractAddress) throw new Error("Contract address not found");

    const parsedAmount = parseCNGNAmount(amount);
    const txHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress, parsedAmount],
      account: (await walletClient.getAddresses())[0],
    });

    return txHash;
  } catch (error) {
    console.error("Error approving cNGN:", error);
    throw new Error(
      (error as { message: string }).message || "Failed to approve cNGN"
    );
  }
};

// Deposit Token to the contract
export const offRampToken = async (
  amount: string,
  chainId: number,
  offRampId: Hex
): Promise<string> => {
  try {
    const walletClient = await getWalletClient(chainId);
    const contractAddress =
      chainConfigs[chainId]?.contractAddress
    if (!contractAddress) throw new Error("Contract address not found");

    const parsedAmount = parseCNGNAmount(amount);
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: DEX_ABI,
      functionName: "offRamp",
      args: [parsedAmount, offRampId],
      account: (await walletClient.getAddresses())[0],
    });

    return txHash;
  } catch (error) {
    console.error("Error withdrawing USDC:", error);
    throw new Error(
      (error as { message: string }).message || "Failed to withdraw USDC"
    );
  }
};

// Bridge cNGN to another chain
export const bridgeToken = async (
  amount: string,
  destinationChainId: number,
  sourceChainId = 1
): Promise<string> => {
  try {
    await ensureCorrectNetwork(sourceChainId);

    const walletClient = await getWalletClient(sourceChainId);
    const contractAddress =
      chainConfigs[sourceChainId]?.contractAddress
    if (!contractAddress) throw new Error("Contract address not found");

    // Generate a unique bridge ID using Web Crypto API
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const bridgeId = toHex(randomBytes);

    const parsedAmount = parseCNGNAmount(amount);
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: DEX_ABI,
      functionName: "bridgeEntry",
      args: [parsedAmount, destinationChainId, bridgeId],
      account: (await walletClient.getAddresses())[0],
    });

    return txHash;
  } catch (error) {
    console.error("Error bridging cNGN:", error);
    throw new Error(
      (error as { message: string }).message || "Failed to bridge cNGN"
    );
  }
};

// Approve tokens to be spent by the contract
export const approveTokens = async (
  amount: string,
  chainId = 1
): Promise<string> => {
  try {
    const walletClient = await getWalletClient(chainId);
    const tokenAddress = chainConfigs[chainId]?.cngnAddress;
    if (!tokenAddress)
      throw new Error("Token address not found in chain configuration");

    const contractAddress =
      chainConfigs[chainId]?.contractAddress
    if (!contractAddress) throw new Error("Contract address not found");

    const parsedAmount = parseCNGNAmount(amount);
    const txHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress, parsedAmount],
      account: (await walletClient.getAddresses())[0],
    });

    return txHash;
  } catch (error) {
    console.error("Error approving tokens:", error);
    throw new Error(
      (error as { message: string }).message || "Failed to approve tokens"
    );
  }
};
