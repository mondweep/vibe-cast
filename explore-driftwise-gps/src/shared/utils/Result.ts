/**
 * Result type for railway-oriented programming pattern
 * Either success (Ok) or failure (Err)
 */
export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

export class Ok<T, E = Error> {
  readonly _tag = 'Ok' as const;

  constructor(readonly value: T) {}

  map<U>(f: (t: T) => U): Result<U, E> {
    return new Ok(f(this.value));
  }

  flatMap<U>(f: (t: T) => Result<U, E>): Result<U, E> {
    return f(this.value);
  }

  mapErr<E2>(_: (e: E) => E2): Result<T, E2> {
    return this as unknown as Result<T, E2>;
  }

  getOrElse(_: (e: E) => T): T {
    return this.value;
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  unwrap(): T {
    return this.value;
  }
}

export class Err<T, E = Error> {
  readonly _tag = 'Err' as const;

  constructor(readonly error: E) {}

  map<U>(_: (t: T) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  flatMap<U>(_: (t: T) => Result<U, E>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  mapErr<E2>(f: (e: E) => E2): Result<T, E2> {
    return new Err(f(this.error));
  }

  getOrElse(f: (e: E) => T): T {
    return f(this.error);
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  unwrap(): T {
    throw new Error(`Called unwrap on Err: ${this.error}`);
  }
}

export const ok = <T, E = Error>(value: T): Result<T, E> => new Ok(value);
export const err = <T, E = Error>(error: E): Result<T, E> => new Err(error);
