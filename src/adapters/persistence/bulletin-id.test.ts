import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';

import { bulletinIdFromBlob, bulletinIdFromBytes, type DigestProvider } from './bulletin-id';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

describe('bulletinIdFromBytes', () => {
  it('asks the injected crypto for a SHA-256 digest of exactly the bytes it was given', async () => {
    const digest = vi.fn(async () => new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer);
    const subtle: DigestProvider = { digest };

    await bulletinIdFromBytes(bytes(1, 2, 3), subtle);

    expect(digest).toHaveBeenCalledTimes(1);
    const [algorithm, data] = digest.mock.calls[0] as unknown as [string, Uint8Array];
    expect(algorithm).toBe('SHA-256');
    expect(Array.from(new Uint8Array(data as unknown as ArrayBufferLike))).toEqual([1, 2, 3]);
  });

  it('renders the digest as lowercase hex, zero-padded', async () => {
    const subtle: DigestProvider = {
      digest: vi.fn(async () => new Uint8Array([0x00, 0x0f, 0xa0, 0xff]).buffer),
    };

    expect(await bulletinIdFromBytes(bytes(1), subtle)).toBe('000fa0ff');
  });

  it('gives the same id for the same bytes and a different id for different bytes', async () => {
    const subtle = webcrypto.subtle as unknown as DigestProvider;

    const a = await bulletinIdFromBytes(bytes(1, 2, 3), subtle);
    const again = await bulletinIdFromBytes(bytes(1, 2, 3), subtle);
    const different = await bulletinIdFromBytes(bytes(1, 2, 4), subtle);

    expect(again).toBe(a);
    expect(different).not.toBe(a);
    expect(a).toHaveLength(64);
  });

  it('never calls the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await bulletinIdFromBytes(bytes(9), webcrypto.subtle as unknown as DigestProvider);

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('bulletinIdFromBlob', () => {
  it('hashes the blob content, so re-loading an identical file yields an identical id', async () => {
    const subtle = webcrypto.subtle as unknown as DigestProvider;
    const pdf = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]);
    const identicalCopy = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]);
    const other = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x47])]);

    expect(await bulletinIdFromBlob(pdf, subtle)).toBe(await bulletinIdFromBlob(identicalCopy, subtle));
    expect(await bulletinIdFromBlob(pdf, subtle)).not.toBe(await bulletinIdFromBlob(other, subtle));
  });
});
