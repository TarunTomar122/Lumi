declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: {
    dialogTitle?: string;
    mimeType?: string;
    UTI?: string;
  }): Promise<void>;
}


