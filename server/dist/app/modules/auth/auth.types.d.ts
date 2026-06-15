export interface AccessPayload {
    sub: string;
    email: string;
    type: "access";
}
export interface RefreshPayload {
    sub: string;
    familyId: string;
    jti: string;
    type: "refresh";
}
export interface RegisterData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
}
export interface LoginData {
    email: string;
    password: string;
}
//# sourceMappingURL=auth.types.d.ts.map