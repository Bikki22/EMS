interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
}
declare const signup: (data: UserData) => Promise<void>;
export { signup };
//# sourceMappingURL=auth.services.d.ts.map