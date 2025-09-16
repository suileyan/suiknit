# API Documentation

## Authentication APIs

### 1. Generate Captcha

**GET** `/auth/captcha`

#### Description
Generate a captcha image for registration or login

#### Parameters
No parameters required

#### Request Example
```
GET /auth/captcha
```

#### Success Response (200)
```json
{
  "code": 200,
  "message": "验证码生成成功",
  "data": {
    "captchaId": "captcha_1726492384567_a1b2c3d4e5f",
    "captchaImage": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiP..."
  }
}
```

#### Error Responses
- 500: Captcha generation failed

---

### 2. User Registration

**POST** `/auth/register`

#### Description
Register a new user account

#### Parameters
| Name | Type | In | Required | Description |
|------|------|----|----------|-------------|
| email | string | body | Yes | User's email address |
| password | string | body | Yes | User's password (min 6 characters) |
| name | string | body | Yes | User's full name |
| captchaId | string | body | Yes | Captcha identifier from /auth/captcha |
| captchaCode | string | body | Yes | Captcha text from the image |

#### Request Example
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "captchaId": "captcha_1726492384567_a1b2c3d4e5f",
  "captchaCode": "ABCD"
}
```

#### Success Response (201)
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### Error Responses
- 400: Invalid parameters or captcha error
- 500: Registration failed

---

### 3. User Login

**POST** `/auth/login`

#### Description
Authenticate user and generate JWT token

#### Parameters
| Name | Type | In | Required | Description |
|------|------|----|----------|-------------|
| email | string | body | Yes | User's email address |
| password | string | body | Yes | User's password |
| captchaId | string | body | Yes | Captcha identifier from /auth/captcha |
| captchaCode | string | body | Yes | Captcha text from the image |

#### Request Example
```json
{
  "email": "user@example.com",
  "password": "password123",
  "captchaId": "captcha_1726492384567_a1b2c3d4e5f",
  "captchaCode": "ABCD"
}
```

#### Success Response (200)
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### Error Responses
- 400: Invalid parameters or captcha error
- 401: Invalid email or password
- 500: Login failed

---

### 4. Token-based Authentication

**GET** `/auth/loginByToken`

#### Description
Verify existing JWT token and generate a new one

#### Parameters
| Name | Type | In | Required | Description |
|------|------|----|----------|-------------|
| token | string | header | Yes | Valid JWT token |

#### Request Example
```
GET /auth/loginByToken
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200)
```json
{
  "code": 200,
  "message": "token验证成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### Error Responses
- 400: Missing token
- 401: Invalid or expired token
- 500: Verification failed

---

### 5. User Logout

**POST** `/auth/logout`

#### Description
Logout user (client should delete token)

#### Parameters
| Name | Type | In | Required | Description |
|------|------|----|----------|-------------|
| token | string | header | Yes | Valid JWT token |

#### Request Example
```
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (200)
```json
{
  "code": 200,
  "message": "注销成功",
  "data": null
}
```

#### Error Responses
- 500: Logout failed

---

### 6. Update User Information

**PUT** `/auth/update`

#### Description
Update user profile information

#### Parameters
| Name | Type | In | Required | Description |
|------|------|----|----------|-------------|
| token | string | header | Yes | Valid JWT token |
| name | string | body | No | User's new name |
| avatarPath | string | body | No | Path to user's avatar |

#### Request Example
```json
{
  "name": "John Smith",
  "avatarPath": "/images/avatar.jpg"
}
```

#### Success Response (200)
```json
{
  "code": 200,
  "message": "用户信息更新成功",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Smith",
      "avatarPath": "/images/avatar.jpg",
      "role": "user"
    }
  }
}
```

#### Error Responses
- 400: Missing token
- 401: Invalid token
- 404: User not found
- 500: Update failed