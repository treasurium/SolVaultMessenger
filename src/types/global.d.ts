// Global type augmentations for React Native polyfills

import {Buffer as BufferType} from 'buffer';

declare global {
  var Buffer: typeof BufferType;
}

export {};
