export declare const isLegacyPasswordHash: (storedHash: string) => boolean;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, storedHash: string, salt?: string | undefined) => Promise<boolean>;
//# sourceMappingURL=crypto.d.ts.map