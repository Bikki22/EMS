export interface UserTokenPayload {
    _id: string;
}
export declare function createUserToken(payload: UserTokenPayload): string;
export declare function verifyUserToken(token: string): UserTokenPayload | null;
//# sourceMappingURL=token.d.ts.map