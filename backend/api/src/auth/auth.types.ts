export type AppRole = 'SUPER_ADMIN' | 'TECHNICIAN';

export interface AuthenticatedUser {
    id: string;
    email: string | null;
    role: AppRole;
    fullName: string;
}