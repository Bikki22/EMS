export declare class ApiError extends Error {
    statusCode: number;
    data: null;
    success: boolean;
    errors: string[];
    constructor(statusCode: number, message?: string, errors?: string[], stack?: string);
}
//# sourceMappingURL=ApiError.d.ts.map