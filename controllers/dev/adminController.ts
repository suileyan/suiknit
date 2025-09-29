import type { Request, Response } from 'express';
import User, { IUser, UserRole } from '@/models/User.js';
import File, { FileStatus } from '@/models/File.js';
import { validateEmail, validatePassword, validateName } from '@/validators/authValidator.js';
import { hasHigherRole, canAssignRole } from '@/utility/auth.js';
import { filterUserUpdate, filterFileUpdate } from '@/services/policyService.js';

// ============ User Management ============

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || '20', 10), 1), 200);
  const role = (req.query.role as string) as UserRole | undefined;

  const filter: any = {};
  if (role && Object.values(UserRole).includes(role)) {
    filter.role = role;
  }

  const total = await User.countDocuments(filter);
  const items = await User.find(filter, '-password')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  res.status(200).json({ items, total, page, pageSize });
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const doc = await User.findById(id, '-password').lean();
  if (!doc) {
    res.status(404).json({ code: 404, message: '用户不存在', data: null });
    return;
  }
  res.status(200).json(doc);
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const actor = (res.locals as any).currentUser as IUser;
  const { email, name, password, role } = req.body || {};

  if (!validateEmail(email)) {
    res.status(400).json({ code: 400, message: '邮箱格式不正确', data: null });
    return;
  }
  const nameValidation = validateName(name);
  if (!nameValidation.isValid) {
    res.status(400).json({ code: 400, message: nameValidation.message, data: null });
    return;
  }
  const pwdValidation = validatePassword(password);
  if (!pwdValidation.isValid) {
    res.status(400).json({ code: 400, message: pwdValidation.message, data: null });
    return;
  }

  const roleToAssign: UserRole = (Object.values(UserRole) as string[]).includes(role) ? role : UserRole.USER;
  if (!canAssignRole(actor, roleToAssign)) {
    res.status(403).json({ code: 403, message: '无权分配该角色', data: null });
    return;
  }

  const exists = await User.findByEmail(email);
  if (exists) {
    res.status(400).json({ code: 400, message: '邮箱已被使用', data: null });
    return;
  }

  const user = new User({ email, name, password, role: roleToAssign });
  const saved = await user.save();
  const data = { id: saved.id, email: saved.email, name: saved.name, role: saved.role, createdAt: saved.createdAt };
  res.status(201).json(data);
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const actor = (res.locals as any).currentUser as IUser;
  const { id } = req.params;
  const doc = await User.findById(id);
  if (!doc) {
    res.status(404).json({ code: 404, message: '用户不存在', data: null });
    return;
  }

  if (doc.id === actor.id) {
    // 允许更新自己的名称/密码，但不允许自我提升角色
  } else {
    // 不能修改相同或更高权限的用户
    if (!hasHigherRole(actor, doc.role)) {
      res.status(403).json({ code: 403, message: '无权修改该用户', data: null });
      return;
    }
  }

  const patch = req.body || {};
  const decision = filterUserUpdate(actor, doc as any, patch);
  if (!decision.allow || !decision.filtered) {
    res.status(403).json({ code: 403, message: decision.reason || '无权修改该用户', data: null });
    return;
  }

  const { email, name, password, role } = decision.filtered as any;

  if (email !== undefined) {
    if (!validateEmail(email)) {
      res.status(400).json({ code: 400, message: '邮箱格式不正确', data: null });
      return;
    }
    const exists = await User.findOne({ email, _id: { $ne: doc._id } });
    if (exists) {
      res.status(400).json({ code: 400, message: '该邮箱已被使用', data: null });
      return;
    }
    doc.email = email;
  }
  if (name !== undefined) {
    const nv = validateName(name);
    if (!nv.isValid) {
      res.status(400).json({ code: 400, message: nv.message, data: null });
      return;
    }
    doc.name = name;
  }
  if (password !== undefined) {
    const pv = validatePassword(password);
    if (!pv.isValid) {
      res.status(400).json({ code: 400, message: pv.message, data: null });
      return;
    }
    doc.password = password; // pre-save hook hashes it
  }
  if (role !== undefined) {
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({ code: 400, message: '角色不合法', data: null });
      return;
    }
    if (!canAssignRole(actor, role)) {
      res.status(403).json({ code: 403, message: '无权分配该角色', data: null });
      return;
    }
    doc.role = role;
  }

  const saved = await doc.save();
  const data = { id: saved.id, email: saved.email, name: saved.name, role: saved.role, updatedAt: saved.updatedAt };
  res.status(200).json(data);
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const actor = (res.locals as any).currentUser as IUser;
  const { id } = req.params;
  const doc = await User.findById(id);
  if (!doc) {
    res.status(404).json({ code: 404, message: '用户不存在', data: null });
    return;
  }
  if (doc.id === actor.id) {
    res.status(400).json({ code: 400, message: '不能删除自己', data: null });
    return;
  }
  if (!hasHigherRole(actor, doc.role)) {
    res.status(403).json({ code: 403, message: '无权删除该用户', data: null });
    return;
  }
  await User.deleteOne({ _id: doc._id });
  res.status(200).json({ id: doc.id, deleted: true });
};

// ============ File Management ============

export const listFiles = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt((req.query.pageSize as string) || '20', 10), 1), 200);
  const status = (req.query.status as string) as FileStatus | undefined;

  const filter: any = {};
  if (status && Object.values(FileStatus).includes(status)) {
    filter.status = status;
  }
  const total = await File.countDocuments(filter);
  const items = await File.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();
  res.status(200).json({ items, total, page, pageSize });
};

export const updateFile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const doc = await File.findById(id);
  if (!doc) {
    res.status(404).json({ code: 404, message: '文件不存在', data: null });
    return;
  }
  const actor = (res.locals as any).currentUser as IUser;
  const decision = filterFileUpdate(actor, doc as any, req.body || {});
  if (!decision.allow || !decision.filtered) {
    res.status(403).json({ code: 403, message: decision.reason || '无权修改该文件', data: null });
    return;
  }
  const { name, description, tags, status } = decision.filtered as any;
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ code: 400, message: '文件名不合法', data: null });
      return;
    }
    doc.name = name.trim();
  }
  if (description !== undefined) {
    if (typeof description !== 'string') {
      res.status(400).json({ code: 400, message: '描述不合法', data: null });
      return;
    }
    doc.description = description;
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      res.status(400).json({ code: 400, message: '标签不合法', data: null });
      return;
    }
    doc.tags = tags as any;
  }
  if (status !== undefined) {
    if (!Object.values(FileStatus).includes(status)) {
      res.status(400).json({ code: 400, message: '状态不合法', data: null });
      return;
    }
    doc.status = status;
  }
  const saved = await doc.save();
  res.status(200).json({ id: saved.id, name: saved.name, status: saved.status, description: saved.description, tags: saved.tags });
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const doc = await File.findById(id);
  if (!doc) {
    res.status(404).json({ code: 404, message: '文件不存在', data: null });
    return;
  }
  // 逻辑删除
  doc.status = FileStatus.DELETED;
  await doc.save();
  res.status(200).json({ id: doc.id, deleted: true });
};

export default {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listFiles,
  updateFile,
  deleteFile
};
