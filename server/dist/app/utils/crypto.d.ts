export declare const generateSalt: () => string;
export declare const hashPassword: (password: string, salt: string) => string;
export declare const verifyPassword: (password: string, salt: string, storedHash: string) => boolean;
//# sourceMappingURL=crypto.d.ts.map