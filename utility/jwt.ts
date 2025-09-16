import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({path: '.env.config'});

const secretKey = process.env.JWENCRPTION;

interface JwtPayload {
  exp: number;
  [key: string]: any;
}

export const generateJWT = (data: object): string => {
    console.log(secretKey)
    return jwt.sign(data, secretKey!, {expiresIn: '1h'})
}

export const verifyJWT = (token: string | undefined): boolean => {
    try {
        console.log("测试",jwt.decode(token!))
        const parsed = jwt.decode(token!) as JwtPayload | null
        if(parsed){
            //详细判定逻辑
            if(Date.now() >= parsed.exp * 1000){
                return true
            }
        }
        return false;
    } catch {
        return false
    }
}