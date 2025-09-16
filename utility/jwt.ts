import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { SignOptions } from 'jsonwebtoken';

dotenv.config({path: '.env.config'});

const secretKey = process.env.JWENCRPTION || 'default_secret_key';
const expiresIn: any = process.env.JWT_EXPIRES_IN || '30d';

export const generateJWT = (data: object): string => {
    const options: SignOptions = {
        expiresIn
    };
    
    return jwt.sign(data, secretKey!, options);
}

export const verifyJWT = (token: string | undefined): boolean => {
    if (!token) return false;
    
    try {
        jwt.verify(token, secretKey!);
        return true;
    } catch {
        return false;
    }
}