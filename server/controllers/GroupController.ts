import { Request, Response } from 'express';
import { z } from 'zod';
import { Group } from '../../shared/domain/Group';
import { CATEGORIES } from '../../shared/domain/categories';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { AuthService } from '../services/AuthService';
import { GroupService } from '../services/GroupService';
import { BaseController } from './BaseController';

const satang = z.number().int().min(0).max(100_000_000_000);
const ids = z.array(z.string().max(64)).max(100);
const weights = (value: z.ZodNumber) => z.record(z.string().max(64), value);

const splitBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('equal'), participantIds: ids }),
  z.object({ kind: z.literal('exact'), amounts: weights(satang) }),
  z.object({ kind: z.literal('percent'), percents: weights(z.number().min(0).max(100)) }),
  z.object({ kind: z.literal('shares'), shares: weights(z.number().min(0).max(1000)) }),
  z.object({
    kind: z.literal('itemized'),
    items: z.array(z.object({ name: z.string().max(80), priceSatang: satang, participantIds: ids })).max(200),
    servicePct: z.number().min(0).max(100),
    vatPct: z.number().min(0).max(100),
  }),
]);

const expenseBody = z.object({
  title: z.string().max(80),
  category: z.string().refine((c) => c in CATEGORIES, 'หมวดหมู่ไม่ถูกต้อง'),
  amountSatang: satang,
  payerId: z.string().max(64),
  split: splitBody,
  date: z.iso.datetime().optional(),
});
const nameBody = z.object({ name: z.string().max(60) });
const memberBody = z.object({ name: z.string().max(30), promptPayId: z.string().max(20).optional() });
const paymentBody = z.object({ fromId: z.string().max(64), toId: z.string().max(64), amountSatang: satang });
const joinBody = z.object({ memberId: z.string().max(64).optional() });

export class GroupController extends BaseController {
  constructor(private readonly auth: AuthService, private readonly groups: GroupService) {
    super();
  }

  protected registerRoutes(): void {
    const r = this.router;
    r.get('/invites/:code', this.preview);
    r.use(requireAuth(this.auth));
    r.post('/invites/:code/join', this.join);
    r.get('/groups', this.list);
    r.post('/groups', this.create);
    r.get('/groups/:id', this.get);
    r.patch('/groups/:id', this.rename);
    r.delete('/groups/:id', this.remove);
    r.post('/groups/:id/members', this.addMember);
    r.put('/groups/:id/members/:memberId', this.updateMember);
    r.delete('/groups/:id/members/:memberId', this.removeMember);
    r.post('/groups/:id/expenses', this.addExpense);
    r.put('/groups/:id/expenses/:txId', this.updateExpense);
    r.post('/groups/:id/payments', this.addPayment);
    r.delete('/groups/:id/transactions/:txId', this.removeTransaction);
  }

  private static user(req: Request) { return (req as AuthedRequest).user; }
  private static param(req: Request, key: string) { return String(req.params[key]); }
  private static send(res: Response, group: Group, status = 200) { res.status(status).json({ group: group.toJSON() }); }

  /** ดูลิงก์เชิญได้โดยยังไม่ล็อกอิน จึงส่งเฉพาะชื่อกลุ่มและชื่อสมาชิก */
  private preview = async (req: Request, res: Response) => {
    const group = await this.groups.previewInvite(GroupController.param(req, 'code'));
    res.json({
      name: group.name,
      members: group.listMembers().map((m) => ({ id: m.id, name: m.name, linked: m.isLinked() })),
    });
  };

  private join = async (req: Request, res: Response) => {
    const { memberId } = joinBody.parse(req.body ?? {});
    GroupController.send(res, await this.groups.join(GroupController.user(req), GroupController.param(req, 'code'), memberId));
  };

  private list = async (req: Request, res: Response) => {
    const groups = await this.groups.listFor(GroupController.user(req));
    res.json({ groups: groups.map((g) => g.toJSON()) });
  };

  private create = async (req: Request, res: Response) => {
    GroupController.send(res, await this.groups.create(GroupController.user(req), nameBody.parse(req.body).name), 201);
  };

  private get = async (req: Request, res: Response) => {
    GroupController.send(res, await this.groups.get(GroupController.user(req), GroupController.param(req, 'id')));
  };

  private rename = async (req: Request, res: Response) => {
    GroupController.send(res, await this.groups.rename(GroupController.user(req), GroupController.param(req, 'id'), nameBody.parse(req.body).name));
  };

  private remove = async (req: Request, res: Response) => {
    await this.groups.delete(GroupController.user(req), GroupController.param(req, 'id'));
    res.status(204).end();
  };

  private addMember = async (req: Request, res: Response) => {
    const { name, promptPayId } = memberBody.parse(req.body);
    GroupController.send(res, await this.groups.addMember(GroupController.user(req), GroupController.param(req, 'id'), name, promptPayId), 201);
  };

  private updateMember = async (req: Request, res: Response) => {
    const { name, promptPayId } = memberBody.parse(req.body);
    GroupController.send(res, await this.groups.updateMember(GroupController.user(req), GroupController.param(req, 'id'), GroupController.param(req, 'memberId'), name, promptPayId));
  };

  private removeMember = async (req: Request, res: Response) => {
    GroupController.send(res, await this.groups.removeMember(GroupController.user(req), GroupController.param(req, 'id'), GroupController.param(req, 'memberId')));
  };

  private addExpense = async (req: Request, res: Response) => {
    GroupController.send(res, await this.groups.saveExpense(GroupController.user(req), GroupController.param(req, 'id'), expenseBody.parse(req.body)), 201);
  };

  private updateExpense = async (req: Request, res: Response) => {
    GroupController.send(res, await this.groups.saveExpense(GroupController.user(req), GroupController.param(req, 'id'), expenseBody.parse(req.body), GroupController.param(req, 'txId')));
  };

  private addPayment = async (req: Request, res: Response) => {
    const { fromId, toId, amountSatang } = paymentBody.parse(req.body);
    GroupController.send(res, await this.groups.recordPayment(GroupController.user(req), GroupController.param(req, 'id'), fromId, toId, amountSatang), 201);
  };

  private removeTransaction = async (req: Request, res: Response) => {
    GroupController.send(res, await this.groups.removeTransaction(GroupController.user(req), GroupController.param(req, 'id'), GroupController.param(req, 'txId')));
  };
}
