/**
 * PKCE (Proof Key for Code Exchange) utilities for Google OAuth
 * Provides secure OAuth flow with code_verifier/code_challenge
 */

// Generate cryptographically random string
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Base64URL encode
function base64URLEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Generate PKCE code verifier and challenge
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate code_verifier (43-128 chars, URL-safe)
  const codeVerifier = base64URLEncode(generateRandomString(32));
  
  // Generate code_challenge (SHA256 of verifier, base64url encoded)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = base64URLEncode(String.fromCharCode(...new Uint8Array(digest)));
  
  return { codeVerifier, codeChallenge };
}

// Generate OAuth state parameter
export function generateOAuthState(): string {
  return base64URLEncode(generateRandomString(16));
}

// Store PKCE parameters in sessionStorage
export function storePKCEParams(codeVerifier: string, state: string): void {
  sessionStorage.setItem("oauth_code_verifier", codeVerifier);
  sessionStorage.setItem("oauth_state", state);
}

// Retrieve and clear PKCE parameters
export function consumePKCEParams(): { codeVerifier: string | null; state: string | null } {
  const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
  const state = sessionStorage.getItem("oauth_state");
  sessionStorage.removeItem("oauth_code_verifier");
  sessionStorage.removeItem("oauth_state");
  return { codeVerifier, state };
}

// Initiate Google OAuth with PKCE
export function initiateGoogleOAuthPKCE(clientId: string, redirectUri: string): void {
  generatePKCE().then(({ codeVerifier, codeChallenge }) => {
    const state = generateOAuthState();
    storePKCEParams(codeVerifier, state);
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: state,
      access_type: "offline",
      prompt: "consent",
    });
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  });
}

// Handle Google OAuth callback (call on page mount)
export function handleGoogleCallbackPKCE(): { code: string; codeVerifier: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const { codeVerifier, state: storedState } = consumePKCEParams();
  
  if (!code || !state || state !== storedState || !codeVerifier) {
    return null; // Invalid callback
  }
  
  return { code, codeVerifier };
}