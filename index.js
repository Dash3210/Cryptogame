/**
 * @format
 */

import { AppRegistry } from 'react-native';
console.log("BRAIN_CIPHER_LOG: Index.js running...");
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
