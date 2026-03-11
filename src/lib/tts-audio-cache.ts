interface UrlApi {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

export interface CachedTtsAudio {
  objectUrl: string;
}

export const DEFAULT_TTS_AUDIO_CACHE_LIMIT = 24;

export function createTtsAudioCache(
  urlApi: UrlApi = URL,
  limit: number = DEFAULT_TTS_AUDIO_CACHE_LIMIT,
) {
  const entries = new Map<string, CachedTtsAudio>();

  return {
    get(messageId: string) {
      return entries.get(messageId);
    },
    store(messageId: string, blob: Blob) {
      const existing = entries.get(messageId);
      if (existing) {
        urlApi.revokeObjectURL(existing.objectUrl);
      }

      const entry = {
        objectUrl: urlApi.createObjectURL(blob),
      };
      entries.set(messageId, entry);

      while (entries.size > limit) {
        const oldestKey = entries.keys().next().value;
        if (!oldestKey) {
          break;
        }

        const oldest = entries.get(oldestKey);
        if (oldest) {
          urlApi.revokeObjectURL(oldest.objectUrl);
        }
        entries.delete(oldestKey);
      }

      return entry;
    },
    clear() {
      for (const entry of entries.values()) {
        urlApi.revokeObjectURL(entry.objectUrl);
      }
      entries.clear();
    },
  };
}
