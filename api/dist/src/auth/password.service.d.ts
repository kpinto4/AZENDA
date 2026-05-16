export declare class PasswordService {
    isBcryptHash(stored: string): boolean;
    hash(plain: string): Promise<string>;
    verify(plain: string, stored: string): Promise<boolean>;
}
