// Polyfills — must be imported before everything else
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import {Buffer} from 'buffer';
global.Buffer = global.Buffer || Buffer;

// App entry
import App from './src/app/App';
export default App;
