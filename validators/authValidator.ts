// 邮箱验证器
export const validateEmail = (email: string): boolean => {
  const emailRegex = 
    /^(?!.*\.\.)[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,63})+$/;
  return emailRegex.test(email);
};

// 密码验证器
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (!password) {
    return { isValid: false, message: '密码不能为空' };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: '密码长度不能少于6位' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: '密码长度不能超过128位' };
  }
  
  return { isValid: true, message: '' };
};

// 姓名验证器
export const validateName = (name: string): { isValid: boolean; message: string } => {
  if (!name) {
    return { isValid: false, message: '姓名不能为空' };
  }
  
  if (name.length > 50) {
    return { isValid: false, message: '姓名长度不能超过50位' };
  }
  
  return { isValid: true, message: '' };
};