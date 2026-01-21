import { Ok, Err, Result as NeverThrowResult } from 'neverthrow';

export type Result<T, E = Error> = NeverThrowResult<T, E>;

export const Ok = Ok;
export const Err = Err;

/**
 * Create a successful result
 */
export const ok = <T>(value: T): Result<T> => Ok(value);

/**
 * Create a failed result
 */
export const err = <E extends Error>(error: E): Result<never, E> => Err(error);
