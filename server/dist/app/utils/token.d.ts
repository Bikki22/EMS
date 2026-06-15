import type { AccessPayload, RefreshPayload } from "../modules/auth/auth.types";
export declare const generateJti: () => string;
export declare const generateFamilyId: () => string;
export declare const generateOpaqueToken: () => string;
export declare const hashToken: (token: string) => string;
export declare const issueAccessToken: (sub: string, email: string) => string;
export declare const issueRefreshToken: (sub: string, familyId: string, jti: string) => string;
export declare const verifyAccessToken: (token: string) => AccessPayload;
export declare const verifyRefreshToken: (token: string) => RefreshPayload;
//# sourceMappingURL=token.d.ts.map