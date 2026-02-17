/**
 * Credential Store
 * 
 * Encrypts and decrypts agent credentials using the Web Crypto API.
 * Uses AES-GCM for encryption with PBKDF2 for key derivation.
 */

// Constants for crypto operations
const ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const HASH_ALGORITHM = 'SHA-256';
const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derive a CryptoKey from a passphrase using PBKDF2
 * 
 * @param passphrase - The user passphrase
 * @returns A CryptoKey suitable for AES-GCM encryption
 */
export async function deriveKey(passphrase: string): Promise<CryptoKey> {
  // Encode the passphrase
  const encoder = new TextEncoder();
  const passphraseData = encoder.encode(passphrase);

  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import the passphrase as a key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passphraseData,
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    baseKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Derive a key with a specific salt (for decryption)
 */
async function deriveKeyWithSalt(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseData = encoder.encode(passphrase);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passphraseData,
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    baseKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypted credential data structure
 */
export interface EncryptedCredential {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
}

/**
 * Encrypt a credential using AES-GCM
 * 
 * @param plaintext - The credential to encrypt
 * @param passphrase - The user's passphrase for key derivation
 * @returns Encrypted credential data including IV and salt
 */
export async function encryptCredential(
  plaintext: string,
  passphrase: string
): Promise<EncryptedCredential> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV and salt
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive key from passphrase
  const key = await deriveKeyWithSalt(passphrase, salt);

  // Encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    data
  );

  // Convert to base64 for storage
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    version: 1,
  };
}

/**
 * Decrypt a credential using AES-GCM
 * 
 * @param encrypted - The encrypted credential data
 * @param passphrase - The user's passphrase for key derivation
 * @returns The decrypted plaintext credential
 * @throws Error if decryption fails (wrong passphrase or corrupted data)
 */
export async function decryptCredential(
  encrypted: EncryptedCredential,
  passphrase: string
): Promise<string> {
  try {
    // Decode from base64
    const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
    const ivBuffer = base64ToArrayBuffer(encrypted.iv);
    const saltBuffer = base64ToArrayBuffer(encrypted.salt);

    // Derive key from passphrase
    const key = await deriveKeyWithSalt(passphrase, new Uint8Array(saltBuffer) as unknown as Uint8Array);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: new Uint8Array(ivBuffer),
      },
      key,
      ciphertext
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error(
      `Failed to decrypt credential: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Legacy encryption function (kept for backward compatibility)
 * Uses a pre-derived CryptoKey
 * 
 * @deprecated Use encryptCredential with passphrase instead
 */
export async function encryptCredentialWithKey(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
}

/**
 * Legacy decryption function (kept for backward compatibility)
 * Uses a pre-derived CryptoKey
 * 
 * @deprecated Use decryptCredential with passphrase instead
 */
export async function decryptCredentialWithKey(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  try {
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: new Uint8Array(ivBuffer),
      },
      key,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error(
      `Failed to decrypt credential: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate a random encryption key for use with legacy functions
 * 
 * @deprecated Use passphrase-based encryption instead
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to base64 string for storage
 * 
 * @deprecated Keys should not be stored; use passphrase derivation instead
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a CryptoKey from base64 string
 * 
 * @deprecated Use passphrase derivation instead
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(keyData);
  return crypto.subtle.importKey(
    'raw',
    buffer,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

// Utility functions

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
