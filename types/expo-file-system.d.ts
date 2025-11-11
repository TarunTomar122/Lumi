declare module 'expo-file-system' {
  export const cacheDirectory: string;
  export enum EncodingType {
    Base64 = 'base64'
  }
  export function readAsStringAsync(uri: string, options?: { encoding?: EncodingType }): Promise<string>;
  export function writeAsStringAsync(uri: string, data: string, options?: { encoding?: EncodingType }): Promise<void>;
}


