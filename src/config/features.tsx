/**
 * Feature Flags System
 * Centralized feature toggles for gradual rollout and A/B testing
 * 
 * Usage:
 * import { FEATURES, isFeatureEnabled } from '../config/features';
 * 
 * if (isFeatureEnabled('turnstile')) { ... }
 * 
 * // Or in JSX:
 * {FEATURES.turnstile && <Turnstile />}
 */

// Default feature flags
interface FeatureFlags {
  // Auth/Security
  turnstile: boolean;
  googleOAuth: boolean;
  googleOAuthPKCE: boolean;
  
  // Real-time
  socketEvents: boolean;
  battleSounds: boolean;
  
  // UI/UX
  virtualizedLists: boolean;
  debouncedSearch: boolean;
  perLanguageCodePreservation: boolean;
  dynamicJavaBoilerplate: boolean;
  
  // Performance
  requestDeduplication: boolean;
  cacheInvalidationV2: boolean;
  
  // Notes
  notesTTL: boolean;
  notesQuota: boolean;
  
  // Admin
  adminServerVerify: boolean;
  
  // Debug/Dev
  debugLogs: boolean;
}

// Environment-based feature detection
function getEnvFlag(key: string, defaultValue: boolean): boolean {
  const envValue = import.meta.env[key];
  if (envValue === undefined) return defaultValue;
  return envValue === 'true' || envValue === '1';
}

// Feature flag configuration
export const FEATURES: FeatureFlags = {
  // Auth/Security
  turnstile: getEnvFlag('VITE_FEATURE_TURNSTILE', true),
  googleOAuth: getEnvFlag('VITE_FEATURE_GOOGLE_OAUTH', true),
  googleOAuthPKCE: getEnvFlag('VITE_FEATURE_GOOGLE_OAUTH_PKCE', true),
  
  // Real-time
  socketEvents: getEnvFlag('VITE_FEATURE_SOCKET_EVENTS', true),
  battleSounds: getEnvFlag('VITE_FEATURE_BATTLE_SOUNDS', true),
  
  // UI/UX
  virtualizedLists: getEnvFlag('VITE_FEATURE_VIRTUALIZED_LISTS', false), // Requires @tanstack/react-virtual
  debouncedSearch: getEnvFlag('VITE_FEATURE_DEBOUNCED_SEARCH', true),
  perLanguageCodePreservation: getEnvFlag('VITE_FEATURE_PER_LANG_CODE', true),
  dynamicJavaBoilerplate: getEnvFlag('VITE_FEATURE_DYNAMIC_JAVA_BOILERPLATE', true),
  
  // Performance
  requestDeduplication: getEnvFlag('VITE_FEATURE_REQUEST_DEDUP', true),
  cacheInvalidationV2: getEnvFlag('VITE_FEATURE_CACHE_INVALIDATION_V2', true),
  
  // Notes
  notesTTL: getEnvFlag('VITE_FEATURE_NOTES_TTL', true),
  notesQuota: getEnvFlag('VITE_FEATURE_NOTES_QUOTA', true),
  
  // Admin
  adminServerVerify: getEnvFlag('VITE_FEATURE_ADMIN_SERVER_VERIFY', true),
  
  // Debug/Dev
  debugLogs: getEnvFlag('VITE_FEATURE_DEBUG_LOGS', import.meta.env.DEV),
};

// Type-safe feature flag checker
export function isFeatureEnabled<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  return FEATURES[key];
}

// Get all enabled features (for debugging)
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

// Feature flag hook for React components
import { useMemo } from 'react';

export function useFeatureFlags(): FeatureFlags {
  // Memoize to prevent unnecessary re-renders
  return useMemo(() => FEATURES, []);
}

export function useIsFeatureEnabled<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  return useMemo(() => FEATURES[key], [key]);
}

// Feature flag component for conditional rendering
import React from 'react';

export function FeatureGate({ 
  feature, 
  children, 
  fallback = null 
}: { 
  feature: keyof FeatureFlags; 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return FEATURES[feature] ? <>{children}</> : <>{fallback}</>;
}