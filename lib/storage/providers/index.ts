import type { StorageProvider, StorageProviderName } from '@/lib/storage/types';
import { googleDriveProvider } from '@/lib/storage/providers/googleDriveProvider';

const providers: Partial<Record<StorageProviderName, StorageProvider>> = {
  google: googleDriveProvider,
};

export function getProvider(name: StorageProviderName): StorageProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Storage provider not implemented: ${name}`);
  }

  return provider;
}

export function isSupportedProvider(name: string): name is StorageProviderName {
  return name === 'google' || name === 'onedrive';
}
