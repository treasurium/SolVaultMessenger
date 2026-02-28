// Type declarations for modules without built-in types

declare module 'tweetnacl-util' {
  export function decodeUTF8(s: string): Uint8Array;
  export function encodeUTF8(arr: Uint8Array): string;
  export function encodeBase64(arr: Uint8Array): string;
  export function decodeBase64(s: string): Uint8Array;
}

declare module 'ed25519-hd-key' {
  export function derivePath(
    path: string,
    seedHex: string,
  ): {key: Buffer; chainCode: Buffer};
  export function getMasterKeyFromSeed(seedHex: string): {
    key: Buffer;
    chainCode: Buffer;
  };
}

declare module 'react-native-qrcode-svg' {
  import {Component} from 'react';
  interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: any;
    logoSize?: number;
    logoMargin?: number;
    logoBorderRadius?: number;
    logoBackgroundColor?: string;
    enableLinearGradient?: boolean;
    gradientDirection?: string[];
    linearGradient?: string[];
    ecl?: 'L' | 'M' | 'Q' | 'H';
    getRef?: (ref: any) => void;
    onError?: (error: any) => void;
    quietZone?: number;
  }
  export default class QRCode extends Component<QRCodeProps> {}
}

declare module 'react-native-quick-sqlite' {
  interface QueryResult {
    rows?: {
      _array: any[];
      length: number;
    };
    insertId?: number;
    rowsAffected: number;
  }

  interface QuickSQLiteConnection {
    execute(query: string, params?: any[]): QueryResult;
    close(): void;
    executeAsync(
      query: string,
      params?: any[],
    ): Promise<QueryResult>;
  }

  interface OpenOptions {
    name: string;
    location?: string;
    encryptionKey?: string;
  }

  export function open(options: OpenOptions): QuickSQLiteConnection;
  export type {QuickSQLiteConnection};
}
