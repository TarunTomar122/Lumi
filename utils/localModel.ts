import RNFS from 'react-native-fs';

const MODEL_DIR = RNFS.DocumentDirectoryPath + '/lumi-model';
const GGUF_FILE = MODEL_DIR + '/lumi_finetuned.gguf';
const META_FILE = MODEL_DIR + '/gguf_metadata.json';
const VOCAB_FILE = MODEL_DIR + '/vocab.json';

export type LocalModelStatus = {
  hasModel: boolean;
  modelPath?: string;
};

export async function ensureModelDir(): Promise<string> {
  const exists = await RNFS.exists(MODEL_DIR);
  if (!exists) {
    await RNFS.mkdir(MODEL_DIR);
  }
  return MODEL_DIR;
}

export async function getLocalModelStatus(): Promise<LocalModelStatus> {
  const hasGguf = await RNFS.exists(GGUF_FILE);
  return {
    hasModel: hasGguf,
    modelPath: hasGguf ? 'file://' + GGUF_FILE : undefined,
  };
}

export async function deleteLocalModel(): Promise<void> {
  const exists = await RNFS.exists(MODEL_DIR);
  if (exists) {
    await RNFS.unlink(MODEL_DIR);
  }
}

export async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (progress: { bytesWritten: number; contentLength: number; pct: number }) => void,
): Promise<void> {
  await ensureModelDir();
  const tmp = destPath + '.download';
  try {
    const task = RNFS.downloadFile({
      fromUrl: url,
      toFile: tmp,
      progressDivider: 5,
      progress: (d) => {
        const contentLength = (d as any).contentLength ?? 0;
        const bytesWritten = (d as any).bytesWritten ?? 0;
        if (onProgress && contentLength > 0) {
          const pct = Math.max(0, Math.min(100, Math.floor((bytesWritten / contentLength) * 100)));
          onProgress({ bytesWritten, contentLength, pct });
        }
      },
    });
    const res = await task.promise;
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      const exists = await RNFS.exists(destPath);
      if (exists) await RNFS.unlink(destPath);
      await RNFS.moveFile(tmp, destPath);
    } else {
      throw new Error('Download failed with status ' + res.statusCode);
    }
  } catch (e) {
    try { await RNFS.unlink(tmp); } catch {}
    throw e;
  }
}

export async function downloadLumiModel(onProgress?: (p: { pct: number; bytesWritten: number; contentLength: number }) => void): Promise<LocalModelStatus> {
  await ensureModelDir();
  await downloadFile(
    'https://huggingface.co/Taru/lumi-mobile/resolve/main/lumi_finetuned.gguf?download=true',
    GGUF_FILE,
    onProgress,
  );
  // Optional helpers; not required by llama.rn but kept for completeness
  try {
    await downloadFile(
      'https://huggingface.co/Taru/lumi-mobile/resolve/main/gguf_metadata.json?download=true',
      META_FILE,
    );
  } catch {}
  try {
    await downloadFile(
      'https://huggingface.co/Taru/lumi-mobile/resolve/main/vocab.json?download=true',
      VOCAB_FILE,
    );
  } catch {}
  return getLocalModelStatus();
}

export function getModelPaths() {
  return {
    modelDir: MODEL_DIR,
    ggufPath: GGUF_FILE,
    ggufUri: 'file://' + GGUF_FILE,
    metaPath: META_FILE,
    vocabPath: VOCAB_FILE,
  };
}


