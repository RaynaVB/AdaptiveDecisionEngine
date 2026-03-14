import 'react-native-gesture-handler';
import 'react-native-get-random-values';

// Polyfill for AbortSignal.any which is missing in React Native but required by Firebase Vertex AI
if (typeof AbortSignal !== 'undefined' && !(AbortSignal as any).any) {
  (AbortSignal as any).any = function (signals: AbortSignal[]) {
    const controller = new AbortController();
    const onAbort = () => {
      controller.abort();
      for (const signal of signals) {
        signal.removeEventListener('abort', onAbort);
      }
    };
    for (const signal of signals) {
      if (signal.aborted) {
        onAbort();
        break;
      }
      signal.addEventListener('abort', onAbort);
    }
    return controller.signal;
  };
}
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
