import type { Request, Response } from "express";
declare class AuthenticationController {
    handleSignup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleLogin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleMe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleLogout(req: Request, res: Response): Promise<void>;
}
export default AuthenticationController;
//# sourceMappingURL=auth.controller.d.ts.map