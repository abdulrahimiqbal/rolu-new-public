import { ethers, solidityPackedKeccak256, SigningKey, Signature } from "ethers";
import RoluTokenABI from '../../contracts/abi/RoluToken.json';
import RoluRewardsABI from '../../contracts/abi/RoluRewards.json';
import { MiniKit, MiniAppSendTransactionErrorPayload, MiniAppSendTransactionSuccessPayload } from '@worldcoin/minikit-js';
import { createSafeProvider } from './provider-factory';

// Define the expected structure for an ABI item (can be more specific if needed)
interface AbiItem {
  type: string;
  name?: string;
  // Add other properties if necessary (inputs, outputs, stateMutability, etc.)
}

// Find the specific ABI fragment for the claimRewards function
const claimRewardsAbiFragment = (RoluRewardsABI.abi as AbiItem[]).find(item => item.type === 'function' && item.name === 'claimRewards');

if (!claimRewardsAbiFragment) {
    console.error("CRITICAL: Could not find claimRewards function ABI fragment in RoluRewards.json!");
    // Consider throwing an error here during initialization if critical
}

/**
 * Token contract addresses for different networks
 */
export const CONTRACTS = {
    // Testnet
    worldChainSepolia: {
        roluToken: process.env.NEXT_PUBLIC_ROLU_TOKEN_ADDRESS_TESTNET || '0xE6140a10D7a3fF0B693cc7bae3EB4Abb64Fe2584',
        roluRewards: process.env.NEXT_PUBLIC_ROLU_REWARDS_CONTRACT_ADDRESS_TESTNET || '',
    },
    // Mainnet (to be added when deployed)
    worldChainMainnet: {
        roluToken: process.env.NEXT_PUBLIC_ROLU_TOKEN_ADDRESS_MAINNET || '0x73Ac70D48832Ba8dA9d7ddaaE5fe03F8F1Ed2928',
        roluRewards: process.env.NEXT_PUBLIC_ROLU_REWARDS_CONTRACT_ADDRESS_MAINNET || '',
    }
};

/**
 * RPC URLs for different networks
 */
export const RPC_URLS = {
    worldChainSepolia: process.env.NEXT_PUBLIC_WORLD_CHAIN_SEPOLIA_RPC || 'https://worldchain-sepolia.g.alchemy.com/public',
    worldChainMainnet: process.env.NEXT_PUBLIC_WORLD_CHAIN_MAINNET_RPC || 'https://worldchain-mainnet.g.alchemy.com/public',
};

/**
 * Chain IDs for the networks
 */
export const CHAIN_IDS = {
    worldChainSepolia: 4801,
    worldChainMainnet: 480,
};

/**
 * Network names for user display
 */
export const NETWORK_NAMES = {
    worldChainSepolia: 'World Chain Sepolia Testnet',
    worldChainMainnet: 'World Chain Mainnet',
};

/**
 * Explorer URLs for contract and transaction links
 */
export const EXPLORER_URLS = {
    worldChainSepolia: process.env.NEXT_PUBLIC_WORLD_CHAIN_SEPOLIA_EXPLORER || 'https://sepolia.worldscan.org',
    worldChainMainnet: process.env.NEXT_PUBLIC_WORLD_CHAIN_MAINNET_EXPLORER || 'https://worldscan.org',
};

/**
 * Default network to use
 */
export const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as 'worldChainSepolia' | 'worldChainMainnet') || 'worldChainSepolia';

/**
 * Creates a provider for connecting to the network
 * @param networkKey - The network to connect to
 * @returns An ethers provider
 */
export function createProvider(networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK): ethers.JsonRpcProvider {
    return createSafeProvider(RPC_URLS[networkKey]);
}

/**
 * Creates a token contract instance using ethers
 * @param provider - ethers provider
 * @param networkKey - 'worldChainSepolia' or 'worldChainMainnet'
 * @returns token contract instance
 */
export function getTokenContract(
    provider: ethers.Provider,
    networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK
) {
    const contractAddress = CONTRACTS[networkKey].roluToken;
    console.log('contractAddress', contractAddress);
    return new ethers.Contract(contractAddress, RoluTokenABI, provider);
}

/**
 * Create a contract instance with a signer (for transactions)
 * @param signer - ethers signer
 * @param networkKey - 'worldChainSepolia' or 'worldChainMainnet'
 * @returns token contract instance with signer
 */
export function getTokenContractWithSigner(
    signer: ethers.Signer,
    networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK
) {
    const contractAddress = CONTRACTS[networkKey].roluToken;
    return new ethers.Contract(contractAddress, RoluTokenABI, signer);
}

/**
 * Get token balance for an address
 * @param address - wallet address to check
 * @param provider - ethers provider (if not provided, a new one will be created)
 * @param networkKey - 'worldChainSepolia' or 'worldChainMainnet'
 * @returns token balance in ROLU
 */
export async function getTokenBalance(
    address: string,
    provider?: ethers.Provider,
    networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK
): Promise<string | null> {
    try {
        // Create a provider if not provided
        const tokenProvider = provider || createProvider(networkKey);
        const tokenContract = getTokenContract(tokenProvider, networkKey);
        const balance = await tokenContract.balanceOf(address);
        return ethers.formatUnits(balance, 18); // 18 decimals
    } catch (error) {
        console.error('Error fetching token balance:', error);
        return null;
    }
}

/**
 * Check if user is connected to the correct network
 * @param provider - ethers provider (if not provided, a new one will be created)
 * @param networkKey - 'worldChainSepolia' or 'worldChainMainnet'
 * @returns true if connected to correct network
 */
export async function isCorrectNetwork(
    provider?: ethers.Provider,
    networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK
): Promise<boolean> {
    try {
        // Create a provider if not provided
        const tokenProvider = provider || createProvider(networkKey);
        const network = await tokenProvider.getNetwork();
        return network.chainId === BigInt(CHAIN_IDS[networkKey]);
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
}

/**
 * Get the explorer URL for a contract, transaction, or address
 * @param type - 'contract', 'tx', 'address', or 'token'
 * @param hash - Contract address, transaction hash, or wallet address
 * @param tokenAddress - Optional token address for token-specific views
 * @param networkKey - 'worldChainSepolia' or 'worldChainMainnet'
 * @returns Full URL to the explorer
 */
export function getExplorerUrl(
    type: 'contract' | 'tx' | 'address' | 'token',
    hash: string,
    networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK,
    tokenAddress?: string
): string {
    const baseUrl = EXPLORER_URLS[networkKey];
    const roluTokenAddress = CONTRACTS[networkKey].roluToken;

    switch (type) {
        case 'contract':
            return `${baseUrl}/address/${hash}`;
        case 'address':
            // For regular address view
            if (!tokenAddress) {
                return `${baseUrl}/address/${hash}`;
            }
            // For token balance of an address
            return `${baseUrl}/token/${tokenAddress}?a=${hash}`;
        case 'token':
            // View wallet's token page (ROLU token by default)
            return `${baseUrl}/token/${tokenAddress || roluTokenAddress}?a=${hash}`;
        case 'tx':
            return `${baseUrl}/tx/${hash}`;
        default:
            return baseUrl;
    }
}

/**
 * Switch network to World Chain (Sepolia or Mainnet)
 * @param provider - ethers provider with signer capabilities
 * @param networkKey - 'worldChainSepolia' or 'worldChainMainnet'
 * @returns success or failure
 */
export async function switchToWorldChain(
    provider: any, // Using any because we need ethereum provider methods not in ethers type
    networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK
): Promise<boolean> {
    try {
        const chainIdHex = `0x${CHAIN_IDS[networkKey].toString(16)}`;

        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
        });

        return true;
    } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: `0x${CHAIN_IDS[networkKey].toString(16)}`,
                            chainName: NETWORK_NAMES[networkKey],
                            nativeCurrency: {
                                name: 'Ether',
                                symbol: 'ETH',
                                decimals: 18,
                            },
                            rpcUrls: [RPC_URLS[networkKey]],
                            blockExplorerUrls: [EXPLORER_URLS[networkKey]],
                        },
                    ],
                });
                return true;
            } catch (addError) {
                console.error('Error adding World Chain network:', addError);
                return false;
            }
        }
        console.error('Error switching network:', switchError);
        return false;
    }
}

/**
 * UNO app ID for deep linking
 */
export const UNO_APP_ID = 'app_a4f7f3e62c1de0b9490a5260cb390b56';

/**
 * ROLU App ID for deep linking back to our app
 */
export const ROLU_APP_ID = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID || '';

/**
 * Other token addresses for swapping
 */
export const WORLD_TOKENS = {
    worldChainSepolia: {
        // Only placeholder values - update when real token addresses are available
        WLD: '0x0000000000000000000000000000000000000000',
        USDC: '0x0000000000000000000000000000000000000000',
    },
    worldChainMainnet: {
        WLD: '0xdC6fF44c5993419FC5AA266737326d28f1F51544', // WLD on WorldChain Mainnet
        USDC: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1', // USDC.e on WorldChain Mainnet
    }
};

/**
 * ROLU App ID from environment variables
 */
const ROLU_MINIKIT_APP_ID = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID; // Used for API calls

/**
 * Orchestrates the process of claiming ROLU tokens via MiniKit.
 * 1. Fetches claim signature from the backend.
 * 2. Calls MiniKit.sendTransaction to prompt user signing via World App.
 * Does NOT wait for tx confirmation here, returns MiniKit result.
 */
export async function initiateClaimRoluTokensViaMiniKit(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    data?: {
        transaction_hash?: `0x${string}`; // Return the actual hash now
        amountClaimedWei?: string;
        nonceUsed?: string;
        claimableRewardId?: string;
    }
}> {
    const ROLU_REWARDS_ADDRESS = CONTRACTS[DEFAULT_NETWORK].roluRewards;
    
    // Note: claimRewardsAbiFragment is now defined globally above

    try {
        if (!ROLU_REWARDS_ADDRESS) {
            throw new Error(`Rewards contract address not configured for network ${DEFAULT_NETWORK}.`);
        }
        if (!ROLU_MINIKIT_APP_ID) {
            throw new Error("Worldcoin App ID (NEXT_PUBLIC_WORLD_ID_APP_ID) is not configured in environment variables.");
        }
        if (!claimRewardsAbiFragment) {
            throw new Error("ClaimRewards ABI fragment not found.");
        }
       
        // 1. Fetch claim signature from the backend
        console.log("Fetching claim signature from /api/rewards/generate-claim-signature...");
        const sigResponse = await fetch("/api/rewards/generate-claim-signature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const sigData = await sigResponse.json();

        if (!sigResponse.ok || !sigData.success) {
            if (sigData.error === "No rewards available to claim") {
                return { success: false, error: sigData.error };
            }
            throw new Error(sigData.error || "Failed to generate claim signature");
        }
        
        const { amount, nonce, signature, claimableRewardId } = sigData.data;
        console.log(`Signature received: amount=${amount}, nonce=${nonce}`);

        if (!amount || !nonce || !signature) {
             throw new Error("Incomplete signature data received from backend.");
        }
        // Check amount again client-side just in case
        if (BigInt(amount) <= 0) {
            return { success: false, error: "No rewards available to claim." };
        }

        // 2. Prepare arguments for the smart contract function call
        // Ensure args are strings as recommended by MiniKit docs
        const contractArgs = [String(amount), String(nonce), signature];

        // 3. Call MiniKit to send the transaction
        const miniKitPayload = {
            transaction: [
                {
                    address: ROLU_REWARDS_ADDRESS,
                    abi: [claimRewardsAbiFragment],
                    functionName: 'claimRewards',
                    args: contractArgs,
                },
            ],
        };
        console.log("Calling MiniKit.sendTransaction with payload:", JSON.stringify(miniKitPayload, null, 2));
        
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(miniKitPayload);
        
        console.log("MiniKit sendTransaction finalPayload:", finalPayload);

        if (finalPayload.status === 'error') {
            const errorPayload = finalPayload as MiniAppSendTransactionErrorPayload;
            const errorMessage = (errorPayload as any).message || 'MiniKit transaction failed or was rejected.';
            console.error("MiniKit Error Message:", errorMessage);
            throw new Error(errorMessage);
        }
        
        // MiniKit successfully queued the transaction request
        const successPayload = finalPayload as MiniAppSendTransactionSuccessPayload;
        const miniKitTransactionId = successPayload.transaction_id;

        if (!miniKitTransactionId) {
            throw new Error("MiniKit succeeded but did not return a transaction_id.");
        }

        console.log("Received MiniKit transaction_id:", miniKitTransactionId);

        // Fetch the actual transaction hash from Worldcoin API
        // Polling mechanism added to handle pending state
        let transactionHash: `0x${string}` | null = null;
        let attempts = 0;
        const maxAttempts = 10; // Poll up to 10 times (was 5)
        const pollInterval = 3000; // 3 seconds interval

        while (attempts < maxAttempts && !transactionHash) {
            attempts++;
            console.log(`Attempt ${attempts} to fetch transaction hash for MiniKit ID: ${miniKitTransactionId}`);
            const apiUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${miniKitTransactionId}?app_id=${ROLU_MINIKIT_APP_ID}&type=transaction`;
            
            // NOTE: This API might require authentication (Authorization: Bearer <api_key>)
            // Add header if needed based on testing or documentation update.
            try {
                const txInfoResponse = await fetch(apiUrl, { method: 'GET' });

                if (!txInfoResponse.ok) {
                     const errorBody = await txInfoResponse.text();
                     console.error(`API Error (Attempt ${attempts}):`, txInfoResponse.status, errorBody);
                     // Don't throw immediately, allow polling to continue unless it's a fatal error like 404
                     if (txInfoResponse.status === 404) {
                         throw new Error(`Transaction ID ${miniKitTransactionId} not found via Worldcoin API.`);
                     }
                     // For other errors, wait and retry
                } else {
                    const txInfo = await txInfoResponse.json();
                    console.log(`API Response (Attempt ${attempts}):`, txInfo);

                    // Handle both snake_case and camelCase property names from API
                    const hash = txInfo.transaction_hash || txInfo.transactionHash;
                    const status = txInfo.transaction_status || txInfo.transactionStatus;

                    if (hash && typeof hash === 'string' && hash.startsWith('0x') && status === 'mined') {
                        transactionHash = hash as `0x${string}`;
                        console.log("Retrieved transaction_hash:", transactionHash);
                        break; // Exit loop on success
                    } else if (status === 'failed') {
                         throw new Error(`Transaction failed according to Worldcoin API. MiniKit ID: ${miniKitTransactionId}`);
                    } else if (status === 'pending') { // Explicitly handle pending
                         console.log(`Transaction status is 'pending' (Attempt ${attempts}/${maxAttempts}). Waiting...`);
                     } else {
                        console.warn("Unexpected API response structure or status:", txInfo);
                    }
                }
            } catch (fetchError) {
                 console.error(`Fetch error during polling (Attempt ${attempts}):`, fetchError);
                 // Decide if fetch error is fatal or if polling should continue
                 if (attempts === maxAttempts) {
                      throw new Error(`Failed to fetch transaction hash after ${maxAttempts} attempts due to fetch errors. Last error: ${fetchError instanceof Error ? fetchError.message : fetchError}`);
                 }
            }
            
            // Wait before next attempt if not successful and not max attempts
            if (!transactionHash && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }

        if (!transactionHash) {
             throw new Error(`Failed to retrieve transaction hash after ${maxAttempts} attempts. Check Worldscan manually with MiniKit ID: ${miniKitTransactionId}`);
        }

        return {
            success: true,
            message: "Claim transaction initiated and hash retrieved.",
            data: {
                transaction_hash: transactionHash, // Return the hash
                amountClaimedWei: amount,
                nonceUsed: nonce,
                claimableRewardId: claimableRewardId,
            }
        };

    } catch (error) {
        console.error('Error in initiateClaimRoluTokensViaMiniKit:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to initiate token claim",
        };
    }
}

/**
 * Generate a UNO deep link URL for token swapping
 * @param param0 - Configuration object
 * @returns UNO deeplink URL string
 */
export function getUnoSwapLink({
    fromToken,
    toToken,
    amount,
    referrerDeeplinkPath,
}: {
    fromToken?: string;
    toToken?: string;
    amount?: string;
    referrerDeeplinkPath?: string;
}): string {
    let path = `?tab=swap`;

    if (fromToken) {
        path += `&fromToken=${fromToken}`;
        if (amount) {
            path += `&amount=${amount}`;
        }
    }

    if (toToken) {
        path += `&toToken=${toToken}`;
    }

    if (ROLU_APP_ID) {
        path += `&referrerAppId=${ROLU_APP_ID}`;
    }

    if (referrerDeeplinkPath) {
        path += `&referrerDeeplinkPath=${encodeURIComponent(referrerDeeplinkPath)}`;
    }

    const encodedPath = encodeURIComponent(path);
    return `https://worldcoin.org/mini-app?app_id=${UNO_APP_ID}&path=${encodedPath}`;
}

/**
 * Convert token amount to wei (with 18 decimals)
 * @param amount - Human-readable token amount
 * @returns Amount in wei as a string
 */
export function tokenToWei(amount: number): string {
    return ethers.parseUnits(amount.toString(), 18).toString();
}

// --- NEW HELPER FUNCTION ---
/**
 * Reads the current admin address from the RoluRewards contract.
 */
export async function getContractAdminAddress(
    networkKey: 'worldChainSepolia' | 'worldChainMainnet' = DEFAULT_NETWORK
): Promise<string | null> {
    try {
        const provider = createProvider(networkKey);
        const rewardsContractAddress = CONTRACTS[networkKey].roluRewards;
        if (!rewardsContractAddress) {
            console.error(`[getContractAdminAddress] RoluRewards address not configured for network ${networkKey}`);
            return null;
        }
        // Minimal ABI for adminAddress view function
        const minimalRewardsAbi = [
            {
                "inputs": [],
                "name": "adminAddress",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        const contract = new ethers.Contract(rewardsContractAddress, minimalRewardsAbi, provider);
        const adminAddr = await contract.adminAddress();
        console.log(`[getContractAdminAddress] Admin address read from contract (${networkKey}): ${adminAddr}`);
        return adminAddr;
    } catch (error) {
        console.error(`[getContractAdminAddress] Error reading admin address from contract (${networkKey}):`, error);
        return null;
    }
} 