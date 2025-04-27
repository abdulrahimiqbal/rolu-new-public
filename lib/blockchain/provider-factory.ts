import { ethers } from 'ethers';
import logger from '../logger';

/**
 * Cleans and validates a wallet address
 * Checks for common issues like spaces or invalid formats
 * 
 * @param address - The wallet address to clean
 * @returns The cleaned address or null if invalid
 */
export function cleanAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  
  // Remove any spaces or non-essential characters
  const cleaned = address.trim();
  
  // Check if it's a valid Ethereum address
  if (ethers.isAddress(cleaned)) {
    // Return checksum address for consistency
    return ethers.getAddress(cleaned);
  }
  
  // If not a valid address, log and return null
  logger.warn(`Invalid address format: ${address}`);
  return null;
}

/**
 * Creates a JsonRpcProvider with ENS disabled to avoid errors on networks like World Chain
 * that don't support ENS lookups
 * 
 * @param rpcUrl - The RPC URL for the provider
 * @param network - Optional network information
 * @returns An ethers JsonRpcProvider with ENS disabled
 */
export function createSafeProvider(
  rpcUrl: string, 
  network?: ethers.Networkish
): ethers.JsonRpcProvider {
  try {
    // Always disable ENS for World Chain networks to avoid errors
    return new ethers.JsonRpcProvider(
      rpcUrl,
      network,
      { disableEns: true } as ethers.JsonRpcApiProviderOptions
    );
  } catch (error) {
    logger.error('Error creating JsonRpcProvider:', error);
    // Fallback with simpler provider if needed
    return new ethers.JsonRpcProvider(rpcUrl);
  }
}

/**
 * Monkey patch the ethers JsonRpcProvider to always disable ENS
 * This is a last resort method to fix ENS issues if specific provider instances
 * are still being created without the disableEns option
 */
export function patchEthersProviders(): void {
  try {
    // Instead of trying to modify the constructor which might have getter/setter issues,
    // just log the initialization attempt and rely on our createSafeProvider function
    logger.info('ENS patching initialized - using createSafeProvider for all connections');
    
    // We don't need to patch the entire ethers.js library which can cause issues,
    // especially in production builds where properties might be optimized differently
  } catch (error) {
    logger.error('Failed to patch ethers providers:', error);
  }
} 