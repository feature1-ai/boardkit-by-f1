import type { NextFunction, Request, Response } from 'express';

type Handler = (req: Request, res: Response) => Promise<void> | void;

/** Async route wrapper — rejections flow to the error middleware. */
export const wrap = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handler(req, res)).catch(next);
};

/**
 * Identity model: the server is identity-agnostic like the engine — the
 * caller's user id rides the X-User-Id header verbatim. Put real auth in
 * front and set the header from the authenticated principal.
 */
export const userOf = (req: Request): string => String(req.headers['x-user-id'] || 'anonymous');
