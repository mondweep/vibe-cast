import { describe, expect, it, vi } from 'vitest';

import {
  bulletinIdFromBlob,
  bulletinIdFromBytes,
  webCryptoDigestProvider,
  type DigestProvider,
} from './bulletin-id';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);
const buffer = (...values: number[]): ArrayBuffer => new Uint8Array(values).buffer as ArrayBuffer;

/** Web Crypto, as the composition root would supply it. */
const realCrypto = (): DigestProvider => webCryptoDigestProvider();

describe('bulletinIdFromBytes', () => {
  it('asks the injected crypto for a SHA-256 digest of exactly the bytes it was given', async () => {
    const digest = vi.fn<DigestProvider['digest']>(async () => buffer(0xde, 0xad, 0xbe, 0xef));
    const subtle: DigestProvider = { digest };

    await bulletinIdFromBytes(bytes(1, 2, 3), subtle);

    expect(digest).toHaveBeenCalledTimes(1);
    expect(digest.mock.calls[0][0]).toBe('SHA-256');
    expect(Array.from(digest.mock.calls[0][1] as Uint8Array)).toEqual([1, 2, 3]);
  });

  it('renders the digest as lowercase hex, zero-padded', async () => {
    const subtle: DigestProvider = { digest: vi.fn(async () => buffer(0x00, 0x0f, 0xa0, 0xff)) };

    expect(await bulletinIdFromBytes(bytes(1), subtle)).toBe('000fa0ff');
  });

  it('gives the same id for the same bytes and a different id for different bytes', async () => {
    const subtle = realCrypto();

    const first = await bulletinIdFromBytes(bytes(1, 2, 3), subtle);
    const again = await bulletinIdFromBytes(bytes(1, 2, 3), subtle);
    const different = await bulletinIdFromBytes(bytes(1, 2, 4), subtle);

    expect(again).toBe(first);
    expect(different).not.toBe(first);
    expect(first).toHaveLength(64);
  });

  it('never calls the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await bulletinIdFromBytes(bytes(9), realCrypto());

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('bulletinIdFromBlob', () => {
  it('hashes the blob content, so re-loading an identical file yields an identical id', async () => {
    const subtle = realCrypto();
    const pdf = new Blob([buffer(0x25, 0x50, 0x44, 0x46)]);
    const identicalCopy = new Blob([buffer(0x25, 0x50, 0x44, 0x46)]);
    const other = new Blob([buffer(0x25, 0x50, 0x44, 0x47)]);

    expect(await bulletinIdFromBlob(pdf, subtle)).toBe(
      await bulletinIdFromBlob(identicalCopy, subtle),
    );
    expect(await bulletinIdFromBlob(pdf, subtle)).not.toBe(await bulletinIdFromBlob(other, subtle));
  });
});
