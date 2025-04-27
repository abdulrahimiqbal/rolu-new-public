# World ID Integration for Rolu

This document outlines how the Rolu Educational Gaming Platform integrates with World ID for secure wallet authentication and blockchain integration.

## Overview

The Rolu platform uses World ID's MiniKit to provide a secure and seamless authentication experience. This integration:

1. Allows users to connect with their World App wallet
2. Uses Sign-In with Ethereum (SIWE) for secure wallet verification
3. Associates the wallet address with the user's account
4. Enables blockchain token rewards (ROLU tokens)

## Prerequisites

- [World ID Developer Account](https://developer.worldcoin.org/)
- [World App](https://worldcoin.org/world-app) installed on user's device
- Environment variables configured (see below)

## Authentication Flow

1. **User clicks "Connect with World ID"**

   - Our component checks if World App is installed
   - If not, it prompts the user to install it

2. **Nonce Generation**

   - The app generates a secure nonce (one-time challenge)
   - This nonce is stored in an HTTP-only cookie

3. **SIWE Authentication**

   - The app calls MiniKit's `walletAuth` command
   - World App opens and asks the user to sign a message
   - The signed message includes the nonce to prevent replay attacks

4. **Signature Verification**

   - The signed message is sent to our server
   - The server verifies the signature using World ID's verification system
   - If valid, it confirms the wallet ownership

5. **User Login**
   - The verified wallet address is used to log the user in
   - If it's a new user, an account is created
   - The wallet address is associated with the user account

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @worldcoin/minikit-js
```

### 2. Environment Variables

Add the following to your `.env` file:

```
NEXT_PUBLIC_WORLD_ID_APP_ID=app_your_world_id_app_id_here
NEXT_PUBLIC_WORLD_ID_ACTION_ID=rolu_game_login
```

### 3. World ID Developer Account

1. Create an app at [https://developer.worldcoin.org/](https://developer.worldcoin.org/)
2. Configure your app with:
   - Action name: `rolu_game_login`
   - Description: "Login to Rolu Educational Gaming Platform"
   - Enable both WLD and Orb verification

### 4. MiniKit Provider

Ensure the MiniKit provider is included in your app layout to initialize the World ID integration.

## Components

### World ID Authentication Component

`components/auth/world-id-auth.tsx` - Handles the World ID authentication flow with MiniKit.

### MiniKit Provider

`components/providers/minikit-provider.tsx` - Initializes the World ID MiniKit.

### API Endpoints

- `/api/nonce` - Generates a secure nonce for SIWE authentication
- `/api/complete-siwe` - Verifies SIWE messages from World App

## Troubleshooting

### Common Issues

1. **"World App not installed" error**

   - Ensure World App is installed on the user's device
   - Direct them to download from [worldcoin.org/world-app](https://worldcoin.org/world-app)

2. **Signature verification fails**

   - Check that your app ID is correct in environment variables
   - Ensure nonce cookies are properly set

3. **Authentication popup doesn't appear**
   - Make sure World App is running in the background
   - Try restarting World App

### Debugging Tools

- Enable debug mode by adding `NEXT_PUBLIC_WORLD_ID_DEBUG=true` to your environment variables
- Check browser console for detailed error messages

## Security Considerations

- Always verify SIWE messages on the server, never client-side only
- Use HTTP-only cookies for storing nonces
- Add rate limiting to prevent brute force attacks
- Set short expiration times for nonces (5-10 minutes)

## References

- [World ID Developer Docs](https://docs.worldcoin.org/)
- [MiniKit Documentation](https://docs.worldcoin.org/reference/minikit-js)
- [SIWE Specification](https://eips.ethereum.org/EIPS/eip-4361)
