import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class PasswordService {
  isBcryptHash(stored: string): boolean {
    return /^\$2[aby]\$\d{2}\$/.test(stored);
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  /** Compara texto plano con hash bcrypt o, en legado ya migrado en caliente, igualdad estricta no recomendada. */
  async verify(plain: string, stored: string): Promise<boolean> {
    if (this.isBcryptHash(stored)) {
      return bcrypt.compare(plain, stored);
    }
    return plain === stored;
  }
}
