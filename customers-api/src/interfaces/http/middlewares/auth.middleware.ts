import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV as env } from '../../../config/env.js';

export function jwtAuth(req: Request, res: Response, next: NextFunction) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try { jwt.verify(token, env.jwtSecret); return next(); } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

export function serviceAuth(req: Request, res: Response, next: NextFunction) {
    const hdr = req.headers.authorization || '';
    const tok = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    console.log('serviceAuth', tok);
    console.log('env.serviceToken', env.serviceToken);
    if (tok !== env.serviceToken) return res.status(401).json({ error: 'Unauthorized service' });
    next();
}