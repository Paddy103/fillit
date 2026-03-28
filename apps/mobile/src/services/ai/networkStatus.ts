/**
 * Network status detection for AI routing decisions.
 *
 * Wraps @react-native-community/netinfo to provide a simple
 * online/offline check for the AI routing service.
 */

import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
}

/**
 * Check current network connectivity.
 *
 * Returns both connection status and internet reachability.
 * A device can be connected to WiFi without internet access,
 * so both checks matter for API-dependent features.
 */
export async function getNetworkState(): Promise<NetworkState> {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? false,
  };
}

/**
 * Check if the device can reach the internet.
 *
 * Convenience wrapper that checks both connection and reachability.
 */
export async function isOnline(): Promise<boolean> {
  const state = await getNetworkState();
  return state.isConnected && state.isInternetReachable;
}
