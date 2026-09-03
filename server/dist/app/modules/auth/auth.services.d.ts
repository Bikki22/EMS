import type { RegisterData, LoginData } from "./auth.types";
export declare class AuthService {
    signup(data: RegisterData): Promise<{
        user: import("mongoose").Document<unknown, {}, import("./auth.model").IUser, {}, import("mongoose").DefaultSchemaOptions> & import("./auth.model").IUser & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        };
        emailSent: boolean;
    }>;
    private trySendVerificationEmail;
    resendVerification(email: string): Promise<void>;
    verifyEmail(token: string): Promise<void>;
    login(data: LoginData): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    issueTokenPair(userId: string, email: string, roles: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Mints a new pair inside the same family. `supersededTokenHash` is the hash
     * that was current until now; it stays acceptable for REFRESH_GRACE_MS so a
     * parallel refresh from another tab is not mistaken for token theft.
     */
    rotateRefreshToken(userId: string, email: string, roles: string, familyId: string, supersededTokenHash: string | null): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    logout(userId: string): Promise<void>;
}
//# sourceMappingURL=auth.services.d.ts.map