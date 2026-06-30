declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'ADMIN' | 'EMPLOYEE';
        email: string;
      };
    }
  }
}

export {};
