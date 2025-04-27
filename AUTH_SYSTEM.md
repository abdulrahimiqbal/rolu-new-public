# Rolu Authentication System

This document outlines the authentication system for the Rolu Educational Gaming Platform, which uses World ID for secure wallet-based authentication.

## Architecture Overview

The authentication system consists of the following components:

1. **Next.js Middleware** - Handles route protection at the edge
2. **Server-side Auth Utilities** - Manages sessions and user data
3. **Client-side Auth Provider** - Provides authentication state to components
4. **Higher-order Component (HOC)** - Protects client-side routes
5. **World ID Integration** - Handles wallet authentication

## Authentication Flow

1. User visits a protected route
2. Middleware checks for authentication token in cookies
3. If no token is found, user is redirected to sign-in page
4. User authenticates with World ID (simplified flow without verification for now)
5. Server creates a session and sets cookies
6. User is redirected to the original route

## Components

### Middleware (`middleware.ts`)

The middleware runs on every request and checks for authentication:

- Allows public routes (sign-in, API endpoints)
- Bypasses admin routes
- Checks for auth token in cookies
- Redirects unauthenticated users to sign-in

### Server Auth Utilities (`lib/auth.ts`)

Server-side functions for authentication:

- `getCurrentUser()` - Gets the current user from session
- `validateToken()` - Validates authentication tokens
- `createSession()` - Creates a new session
- `clearSession()` - Clears the session
- `isAuthenticated()` - Checks if the user is authenticated
- `getWorldIdUsername()` - Gets username from World ID

### Auth Provider (`contexts/auth-provider.tsx`)

Client-side context provider for authentication:

- Manages authentication state
- Provides login/logout functions
- Updates user stats
- Works with server-side session

### Auth HOC (`components/auth/with-auth.tsx`)

Higher-order component for protecting client routes:

- Checks authentication status
- Redirects unauthenticated users
- Shows loading state
- Renders protected component when authenticated

### World ID Auth (`components/auth/world-id-auth.tsx`)

Handles World ID authentication:

- Connects to World App
- Handles SIWE (Sign-In with Ethereum)
- Gets wallet address from World ID
- Creates user session (verification step removed for now)

## API Routes

### Authentication Endpoints

- `/api/nonce` - Generates a nonce for SIWE
- `/api/auth/login` - Creates a user session
- `/api/auth/logout` - Clears the user session
- `/api/user/update-stats` - Updates user stats

## Usage

### Protecting Server Components

Server components can use the server-side auth utilities:

```typescript
import { getCurrentUser } from "@/lib/auth";

export default async function ServerComponent() {
  const user = await getCurrentUser();

  if (!user) {
    // Handle unauthenticated state
    return <p>Please sign in</p>;
  }

  return <p>Welcome, {user.username}!</p>;
}
```

### Protecting Client Components

Client components can use the HOC:

```typescript
import { withAuth } from "@/components/auth/with-auth";

function ProtectedComponent() {
  // Component logic
  return <div>Protected content</div>;
}

export default withAuth(ProtectedComponent);
```

### Accessing Auth State

Components can access auth state using the `useAuth` hook:

```typescript
import { useAuth } from "@/contexts/auth-provider";

function MyComponent() {
  const { user, login, logout, status } = useAuth();

  return (
    <div>
      {status === "authenticated" ? (
        <p>Welcome, {user.username}!</p>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

## Security Considerations

- HTTP-only cookies for sensitive data
- Short expiration times for sessions
- Secure and SameSite cookie settings
- Server-side validation of authentication

## Future Improvements

- Add SIWE message verification
- Implement JWT for more secure tokens
- Add refresh token mechanism
- Integrate with database for persistent sessions
- Add rate limiting for authentication endpoints
- Implement multi-factor authentication options
