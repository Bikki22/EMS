import type { RegisterData, LoginData } from "./auth.types";
export declare class AuthService {
    signup(data: RegisterData): Promise<import("mongoose").Document<unknown, {}, import("./auth.model").IUser, {}, import("mongoose").DefaultSchemaOptions> & import("./auth.model").IUser & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    verifyEmail(token: string): Promise<void>;
    login(data: LoginData): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    issueTokenPair(userId: string, email: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    rotateRefreshToken(userId: string, email: string, familyId: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    logout(userId: string): Promise<void>;
}
//# sourceMappingURL=auth.services.d.ts.map