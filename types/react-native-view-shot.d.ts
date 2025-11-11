declare module 'react-native-view-shot' {
  import * as React from 'react';
  export interface CaptureOptions {
    format?: 'png' | 'jpg' | 'webm' | 'raw';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64' | 'zip';
    width?: number;
    height?: number;
  }
  export default class ViewShot extends React.Component<any> {
    capture(options?: CaptureOptions): Promise<string>;
  }
  export function captureRef(viewRef: any, options?: CaptureOptions): Promise<string>;
}


