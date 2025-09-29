import type { IUser } from '@/models/User.js';
import { UserRole } from '@/models/User.js';
import type { IFile } from '@/models/File.js';
import { FileStatus } from '@/models/File.js';
import FilePermission from '@/models/FilePermission.js';
import { FilePermissionRole } from '@/models/FilePermission.js';
import { hasRoleAtLeast, hasHigherRole as _hasHigherRole, canAssignRole as _canAssignRole } from '@/utility/auth.js';

export type PolicyDecision = { allow: boolean; reason?: string };
export type FieldDecision<T extends object = any> = { allow: boolean; reason?: string; filtered?: Partial<T> };

// ========== 用户资源策略 ==========

export const canViewUsers = (actor: IUser | null): PolicyDecision => {
  if (!actor) return { allow: false, reason: '未登录' };
  if (hasRoleAtLeast(actor.role, UserRole.ADMIN)) return { allow: true };
  return { allow: false, reason: '需要管理员及以上权限' };
};

export const canManageUser = (actor: IUser | null, target: IUser): PolicyDecision => {
  if (!actor) return { allow: false, reason: '未登录' };
  if (target.id === actor.id) return { allow: false, reason: '不可操作自身' };
  if (_hasHigherRole(actor, target.role)) return { allow: true };
  return { allow: false, reason: '目标权限不低于操作者' };
};

export const canAssignRole = (actor: IUser | null, newRole: UserRole): PolicyDecision => {
  if (!actor) return { allow: false, reason: '未登录' };
  if (_canAssignRole(actor, newRole)) return { allow: true };
  return { allow: false, reason: '不可分配不低于自身的角色' };
};

// ========== 文件资源策略 ==========

export const canListFiles = (actor: IUser | null): PolicyDecision => {
  if (!actor) return { allow: false, reason: '未登录' };
  if (hasRoleAtLeast(actor.role, UserRole.ADMIN)) return { allow: true };
  return { allow: false, reason: '需要管理员及以上权限' };
};

export const canUpdateFile = (actor: IUser | null, file: IFile): PolicyDecision => {
  if (!actor) return { allow: false, reason: '未登录' };
  if (hasRoleAtLeast(actor.role, UserRole.ADMIN)) return { allow: true };
  if (file.createdBy === actor.id) return { allow: true };
  return { allow: false, reason: '仅作者或管理员可更新' };
};

export const canDeleteFile = (actor: IUser | null, file: IFile): PolicyDecision => {
  if (!actor) return { allow: false, reason: '未登录' };
  if (hasRoleAtLeast(actor.role, UserRole.ADMIN)) return { allow: true };
  if (file.createdBy === actor.id) return { allow: true };
  return { allow: false, reason: '仅作者或管理员可删除' };
};

export const canDownloadFile = async (actor: IUser | null, file: IFile): Promise<PolicyDecision> => {
  if (!actor) return { allow: false, reason: '未登录' };
  // 管理员/版主可下载任何文件
  if (hasRoleAtLeast(actor.role, UserRole.ADMIN)) return { allow: true };
  // 文件需要处于 active
  if (file.status !== FileStatus.ACTIVE) return { allow: false, reason: '文件不可访问' };
  // 作者可下载
  if (file.createdBy === actor.id) return { allow: true };
  // 检查权限记录
  const perm = await FilePermission.findOne({ fileId: file.id, userId: actor.id });
  if (perm && [FilePermissionRole.OWNER, FilePermissionRole.EDITOR, FilePermissionRole.VIEWER].includes(perm.role)) {
    return { allow: true };
  }
  return { allow: false, reason: '缺少下载权限' };
};

export default {
  canViewUsers,
  canManageUser,
  canAssignRole,
  canListFiles,
  canUpdateFile,
  canDeleteFile,
  canDownloadFile
};

// ======== ABAC：字段级过滤策略 ========

type AnyPatch = Record<string, any>;

export const filterUserUpdate = (actor: IUser | null, target: IUser, patch: AnyPatch): FieldDecision<any> => {
  if (!actor) return { allow: false, reason: '未登录' };
  const isSelf = actor.id === target.id;
  const result: AnyPatch = {};

  // 自身更新：仅允许修改 name/avatarPath/password
  if (isSelf) {
    if (typeof patch.name === 'string') result.name = patch.name;
    if (typeof patch.avatarPath === 'string') result.avatarPath = patch.avatarPath;
    if (typeof patch.password === 'string') result.password = patch.password;
    const ok = Object.keys(result).length > 0;
    const resp: FieldDecision<any> = { allow: ok, filtered: result };
    if (!ok) (resp as any).reason = '无可修改字段';
    return resp;
  }

  // 非自身：需要操作者角色高于目标用户角色
  if (!_hasHigherRole(actor, target.role)) return { allow: false, reason: '目标权限不低于操作者' };

  // 对低权限目标用户，管理员/版主可修改以下字段
  if (typeof patch.name === 'string') result.name = patch.name;
  if (typeof patch.avatarPath === 'string') result.avatarPath = patch.avatarPath;
  if (typeof patch.password === 'string') result.password = patch.password;
  if (typeof patch.email === 'string') result.email = patch.email;

  if (patch.role) {
    const nextRole = patch.role as UserRole;
    if (_canAssignRole(actor, nextRole)) {
      result.role = nextRole;
    }
  }

  {
    const ok = Object.keys(result).length > 0;
    const resp: FieldDecision<any> = { allow: ok, filtered: result };
    if (!ok) (resp as any).reason = '无可修改字段';
    return resp;
  }
};

export const filterFileUpdate = (actor: IUser | null, file: IFile, patch: AnyPatch): FieldDecision<any> => {
  if (!actor) return { allow: false, reason: '未登录' };
  const isOwner = file.createdBy === actor.id;
  const isAdmin = hasRoleAtLeast(actor.role, UserRole.ADMIN);
  const result: AnyPatch = {};

  // 拥有修改权限的操作者：允许更新基础字段
  if (typeof patch.name === 'string' && patch.name.trim()) result.name = String(patch.name);
  if (typeof patch.description === 'string') result.description = String(patch.description);
  if (Array.isArray(patch.tags)) result.tags = patch.tags;

  // 状态字段仅作者或管理员可修改
  if (patch.status && (isAdmin || isOwner)) {
    const s = String(patch.status) as FileStatus;
    if (Object.values(FileStatus).includes(s)) result.status = s;
  }

  const allowed = isAdmin || isOwner;
  const ok = allowed && Object.keys(result).length > 0;
  const resp: FieldDecision<any> = { allow: ok, filtered: result };
  if (!allowed) (resp as any).reason = '仅作者或管理员可更新';
  else if (!ok) (resp as any).reason = '无可修改字段';
  return resp;
};
