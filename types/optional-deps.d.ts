// Type declarations for optional dependencies

// Tesseract.js types
declare module "tesseract.js" {
  interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
    };
  }

  interface ProgressMessage {
    status: string;
    progress: number;
  }

  interface RecognizeOptions {
    logger?: (m: ProgressMessage) => void;
  }

  export function recognize(
    image: string | Buffer | File | Blob,
    lang?: string,
    options?: RecognizeOptions
  ): Promise<RecognizeResult>;
}

// ClamScan types
declare module "clamscan" {
  interface ClamScanOptions {
    removeInfected?: boolean;
    quarantineInfected?: boolean;
    scanLog?: string | null;
    debugMode?: boolean;
    clamdscan?: {
      socket?: string;
      host?: string;
      port?: number;
      timeout?: number;
      localFallback?: boolean;
    };
  }

  interface ScanResult {
    isInfected: boolean;
    viruses: string[];
  }

  class NodeClam {
    init(options?: ClamScanOptions): Promise<this>;
    isInfected(filePath: string): Promise<ScanResult>;
  }

  export default NodeClam;
}
