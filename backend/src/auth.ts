import type { NextFunction, Request, Response } from 'express';

/**
 * The identity of the caller, as established by a verified Firebase ID token.
 * ADR-006: userId is always the token's verified subject, never a value the
 * client supplied.
 */
export interface VerifiedUser {
  readonly uid: string;
  readonly email?: string;
}

export type TokenVerifier = (idToken: string) => Promise<VerifiedUser>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: VerifiedUser;
    }
  }
}

/**
 * Reject anything without a valid bearer token.
 *
 * ADR-006 keeps authorisation deliberately trivial: a user may only ever
 * reach documents under their own uid. There are no roles, no sharing and no
 * delegation in v1, because every one of those is a way to accidentally let
 * someone read another person's bedroom data.
 */
export function requireAuth(verify: TokenVerifier) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.header('authorization') ?? '';
    const match = /^Bearer (.+)$/i.exec(header.trim());
    if (match === null) {
      res.status(401).json({ error: 'missing_bearer_token' });
      return;
    }
    try {
      req.user = await verify(match[1]);
      next();
    } catch {
      res.status(401).json({ error: 'invalid_token' });
    }
  };
}
