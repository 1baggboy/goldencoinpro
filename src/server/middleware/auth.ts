import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth as adminAuth, db } from '../lib/firebase';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized. Missing token." });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Try JWT first
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      return next();
    } catch (jwtErr) {
      // If JWT fails, try Firebase ID Token if admin auth is available
      if (adminAuth) {
        try {
          const firebaseUser = await adminAuth.verifyIdToken(token);
          let role = 'USER';
          
          if (db) {
            try {
              const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData && (userData.role === 'admin' || userData.role === 'ADMIN')) {
                  role = 'ADMIN';
                }
              }
            } catch (dbErr) {
              console.warn('[Auth] Failed to fetch user role from DB:', dbErr);
            }
          }
          
          if (role !== 'ADMIN') {
            const isAdminEmail = 
              firebaseUser.email === 'lookuptoadams@gmail.com' || 
              firebaseUser.email === 'info.goldencoinltd@gmail.com' || 
              firebaseUser.email === 'support@goldencoin.live' ||
              firebaseUser.email?.endsWith('@goldencoin.live');
            role = isAdminEmail ? 'ADMIN' : 'USER';
          }

          req.user = {
            userId: firebaseUser.uid,
            role,
            email: firebaseUser.email || ''
          };
          return next();
        } catch (fbErr) {
          console.warn('[Auth] Both JWT and Firebase token verification failed. Firebase Error:', fbErr);
        }
      }
      throw jwtErr; // Re-throw JWT error if Firebase check also fails or isn't possible
    }
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: "Forbidden. Admin access required." });
  }
  next();
};
