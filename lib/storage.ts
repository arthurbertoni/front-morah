import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Guarda os tokens: SecureStore no celular (criptografado) e localStorage na web.

const web = Platform.OS === 'web';

export async function lerItem(chave: string): Promise<string | null> {
  if (web) {
    try {
      return globalThis.localStorage?.getItem(chave) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(chave);
}

export async function gravarItem(chave: string, valor: string): Promise<void> {
  if (web) {
    try {
      globalThis.localStorage?.setItem(chave, valor);
    } catch {
      // sem armazenamento disponível (aba privada): a sessão vale só enquanto a página estiver aberta
    }
    return;
  }
  await SecureStore.setItemAsync(chave, valor);
}

export async function removerItem(chave: string): Promise<void> {
  if (web) {
    try {
      globalThis.localStorage?.removeItem(chave);
    } catch {
      // ignorado
    }
    return;
  }
  await SecureStore.deleteItemAsync(chave);
}
