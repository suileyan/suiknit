import { UserRole } from '@/models/User.js';

// 路由访问控制规则说明
// - 未被任何规则匹配到的路由：默认“不做权限校验”（即对所有人开放）。
// - 命中规则的路由：要求当前用户的“角色 >= minRole”。
// - 角色优先级（从低到高）：user < admin < moderator。
// - 匹配顺序：自上而下，第一条匹配即生效；建议将更具体的规则放在前面。

// 受支持的 HTTP 方法枚举；'ALL' 表示不区分方法（任意方法都匹配）
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ALL';

// 单条路由规则的含义：
// - method: 可选，缺省等价于 'ALL'；仅当请求方法与此字段一致时规则才会匹配。
// - path: 路径匹配条件，可以是：
//   * 字符串：
//     - 完全匹配：例如 '/api/ping' 仅匹配该路径；
//     - 前缀匹配：以 '*' 结尾表示“前缀”，例如 '/dev/admin*' 匹配 '/dev/admin' 及其子路径；
//   * 正则表达式：适合一类路径的归纳匹配（例如上传接口分组）。
// - minRole: 访问此路由所需的最低角色，当前用户角色必须“大于等于”该值。
export type RouteRule = {
  method?: HttpMethod; // 默认 'ALL'（不限方法）
  path: string | RegExp; // 字符串支持完全匹配或以 '*' 结尾的前缀匹配，也可用正则
  minRole: UserRole; // 访问所需的最低角色
};

// 核心规则集：未匹配到的路由默认放行
export const routeAccessRules: RouteRule[] = [
  // 管理端 API：匹配 /dev/admin 及其所有子路径，要求至少 ADMIN
  { method: 'ALL', path: /^\/dev\/admin(\/.*)?$/, minRole: UserRole.ADMIN },

  // 需要“登录用户（USER 及以上）”方可访问的常见接口
  { method: 'PUT', path: '/dev/auth/updateUserInfo', minRole: UserRole.USER },
  { method: 'GET', path: '/dev/auth/avatar', minRole: UserRole.USER },
  // 上传类接口（single/multiple/chunk），使用正则统一匹配
  { method: 'POST', path: /^\/dev\/file\/upload\/(single|multiple|chunk)$/i, minRole: UserRole.USER },
  { method: 'POST', path: '/dev/file/upload/init', minRole: UserRole.USER },
  { method: 'POST', path: '/dev/file/upload/merge', minRole: UserRole.USER },
  // 下载令牌生成需要登录
  { method: 'POST', path: '/dev/file/download/token', minRole: UserRole.USER }
];

export default routeAccessRules;
