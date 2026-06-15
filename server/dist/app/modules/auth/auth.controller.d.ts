import type { Request, Response } from "express";
declare class AuthenticationController {
    handleSignup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleVerifyEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleLogin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleRefresh(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleForgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleResetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleMe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleLogout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export default AuthenticationController;
//# sourceMappingURL=auth.controller.d.ts.map