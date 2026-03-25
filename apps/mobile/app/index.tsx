/**
 * Root index screen — redirects to the (tabs) group.
 *
 * This file handles the entry redirect from `/` to `/(tabs)/home`
 * so the app always lands on the Home tab.
 */

import { Redirect } from 'expo-router';

export default function IndexScreen() {
  return <Redirect href="/(tabs)/home" />;
}
