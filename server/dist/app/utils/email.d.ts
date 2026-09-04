export declare const sendVerificationEmail: (to: string, token: string) => Promise<void>;
export declare const sendPasswordResetEmail: (to: string, token: string) => Promise<void>;
export declare const sendTicketTransferEmail: (to: string, ticket: {
    eventTitle: string;
    ticketName: string;
    startsAt: Date;
}) => Promise<void>;
//# sourceMappingURL=email.d.ts.map