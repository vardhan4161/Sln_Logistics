import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

export function App() {
  const ctx = require.context(
    './app',
    true,
    /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+html)|(?:\+middleware)))\.[tj]sx?$).*(?:\.ios|\.web)?\.[tj]sx?$/
  );
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
