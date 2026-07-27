/**
 * `BulletinId` — the content hash of the source PDF (PRD §5.1, §5.6).
 *
 * The same file always produces the same id, which is precisely what makes
 * re-loading a bulletin idempotent: the timeline deduplicates on this value, so
 * dragging yesterday's PDF in twice cannot produce two entries.
 *
 * The digest provider is injected rather than reached for via `globalThis.crypto`
 * so this is unit-testable in Node without a DOM, and so the dependency on Web
 * Crypto is visible at the composition root instead of hidden in a module.
 */

import type { BulletinId } from '../../domain/shared/flood-situation-report';

/** The slice of `SubtleCrypto` we actually use. Narrow ports are easy to double. */
export interface DigestProvider {
  digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>;
}

const HASH_ALGORITHM = 'SHA-256';

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const bulletinIdFromBytes = async (
  bytes: BufferSource,
  subtle: DigestProvider,
): Promise<BulletinId> => toHex(await subtle.digest(HASH_ALGORITHM, bytes)) as BulletinId;

export const bulletinIdFromBlob = async (
  file: Blob,
  subtle: DigestProvider,
): Promise<BulletinId> => bulletinIdFromBytes(new Uint8Array(await file.arrayBuffer()), subtle);

/**
 * The browser's Web Crypto. Called only from the composition root; everything
 * else takes a `DigestProvider`.
 */
export const webCryptoDigestProvider = (): DigestProvider =>
  globalThis.crypto.subtle as unknown as DigestProvider;
