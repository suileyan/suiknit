import type { Request, Response } from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const LOG_DIR = (process.env.LOGPATH || './resource/logs').replace(/\\/g, '/');

const ensureLogDir = async (): Promise<string> => {
  const abs = path.resolve(LOG_DIR);
  await fs.mkdir(abs, { recursive: true }).catch(() => void 0);
  return abs;
};

export const listLogFiles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const dir = await ensureLogDir();
    const files = await fs.readdir(dir);
    const items = files
      .filter(f => f.endsWith('.log'))
      .map(f => ({ name: f, path: path.join(dir, f), date: f.replace(/\.log$/, '') }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.status(200).json(items);
  } catch (_error) {
    res.status(500).json({ code: 500, message: '读取日志文件失败', data: null });
  }
};

type Query = {
  date?: string;
  file?: string;
  tail?: string;
  keyword?: string;
  method?: string;
  path?: string;
  status?: string;
};

export const getLogs = async (req: Request<unknown, unknown, unknown, Query>, res: Response): Promise<void> => {
  try {
    const dir = await ensureLogDir();
    const { date, file } = req.query;
    const base = (file || (date ? `${date}.log` : '')) as string;
    let target = base ? path.resolve(dir, base) : path.resolve(dir, new Date().toISOString().split('T')[0] + '.log');

    // 路径校验
    if (!target.startsWith(path.resolve(dir))) {
      res.status(400).json({ code: 400, message: '非法日志路径', data: null });
      return;
    }

    // 若目标不存在，尝试使用最新的一个日志文件；若仍无则返回空
    if (!fsSync.existsSync(target)) {
      try {
        const files = (await fs.readdir(dir)).filter(f => f.endsWith('.log')).sort();
        if (files.length > 0) {
          const last = files[files.length - 1] as string;
          target = path.resolve(dir, last);
        } else {
          res.status(200).json({ file: '', count: 0, total: 0, lines: [] });
          return;
        }
      } catch {
        res.status(200).json({ file: '', count: 0, total: 0, lines: [] });
        return;
      }
    }

    const stat = await fs.stat(target);
    const maxReadBytes = 1 * 1024 * 1024; // 1MB 窗口
    let content: string;
    if (stat.size > maxReadBytes) {
      // 读取最后 1MB
      const fd = await fs.open(target, 'r');
      const start = stat.size - maxReadBytes;
      const buf = Buffer.allocUnsafe(maxReadBytes);
      await fd.read(buf, 0, maxReadBytes, start);
      await fd.close();
      content = buf.toString('utf8');
    } else {
      content = await fs.readFile(target, 'utf8');
    }

    const linesAll = content.split(/\r?\n/).filter(Boolean);
    const tail = Math.min(Math.max(parseInt(String(req.query.tail || '200'), 10), 1), 5000);

    // 过滤（keyword/method/path/status）
    let filtered = linesAll;
    const keyword = (req.query.keyword || '').trim();
    const method = (req.query.method || '').trim().toUpperCase();
    const pth = (req.query.path || '').trim();
    const status = (req.query.status || '').trim();

    if (keyword) {
      filtered = filtered.filter(l => l.includes(keyword));
    }
    if (method) {
      filtered = filtered.filter(l => l.includes(`method:${method}`));
    }
    if (pth) {
      filtered = filtered.filter(l => l.includes(`path:"${pth}`) || l.includes(`path:${pth}`));
    }
    if (status) {
      filtered = filtered.filter(l => l.includes(`status:'${status}'`));
    }

    const lines = filtered.slice(-tail);
    res.status(200).json({ file: path.basename(target), count: lines.length, total: filtered.length, lines });
  } catch (_error) {
    res.status(500).json({ code: 500, message: '读取日志失败', data: null });
  }
};

export default {
  listLogFiles,
  getLogs
};
