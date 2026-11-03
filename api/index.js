// server/serverless.ts
import mongoose2 from "mongoose";

// server/app.ts
import path from "node:path";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

// server/controllers/AuthController.ts
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

// server/errors.ts
var HttpError = class extends Error {
};
var BadRequestError = class extends HttpError {
  status = 400;
};
var UnauthorizedError = class extends HttpError {
  status = 401;
};
var ForbiddenError = class extends HttpError {
  status = 403;
};
var NotFoundError = class extends HttpError {
  status = 404;
};
var ConflictError = class extends HttpError {
  status = 409;
};

// server/middleware/auth.ts
var COOKIE_NAME = "hlt_session";
function requireAuth(auth) {
  return async (req, _res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) throw new UnauthorizedError("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A");
    req.user = await auth.verifyToken(token);
    next();
  };
}

// server/controllers/BaseController.ts
import { Router } from "express";
var BaseController = class {
  router = Router({ mergeParams: true });
  /** เรียกหลังสร้างวัตถุเสร็จ เพื่อให้ Parameter Property ของคลาสลูกพร้อมใช้งานแล้ว */
  build() {
    this.registerRoutes();
    return this.router;
  }
};

// server/controllers/AuthController.ts
var registerBody = z.object({
  email: z.email("\u0E01\u0E23\u0E2D\u0E01\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E43\u0E2B\u0E49\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07").max(254),
  password: z.string().min(8, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 8 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23").max(72, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19 72 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23"),
  name: z.string().trim().min(1, "\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D").max(30, "\u0E0A\u0E37\u0E48\u0E2D\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19 30 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23")
});
var loginBody = z.object({ email: z.string().max(254), password: z.string().max(72) });
var AuthController = class extends BaseController {
  constructor(auth, secureCookie, rateLimitMax) {
    super();
    this.auth = auth;
    this.secureCookie = secureCookie;
    this.rateLimitMax = rateLimitMax;
  }
  auth;
  secureCookie;
  rateLimitMax;
  registerRoutes() {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1e3,
      limit: this.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "\u0E25\u0E2D\u0E07\u0E2B\u0E25\u0E32\u0E22\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E23\u0E2D 15 \u0E19\u0E32\u0E17\u0E35\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48" }
    });
    this.router.post("/register", limiter, this.register);
    this.router.post("/login", limiter, this.login);
    this.router.post("/logout", this.logout);
    this.router.get("/me", requireAuth(this.auth), this.me);
  }
  register = async (req, res) => {
    const { email, password, name } = registerBody.parse(req.body);
    this.startSession(res, await this.auth.register(email, password, name), 201);
  };
  login = async (req, res) => {
    const { email, password } = loginBody.parse(req.body);
    this.startSession(res, await this.auth.login(email, password), 200);
  };
  logout = (_req, res) => {
    res.clearCookie(COOKIE_NAME).status(204).end();
  };
  me = (req, res) => {
    res.json({ user: req.user });
  };
  /** เก็บ Token ใน Cookie แบบ httpOnly โค้ด JavaScript บนหน้าเว็บจึงอ่านไม่ได้ */
  startSession(res, user, status) {
    res.cookie(COOKIE_NAME, this.auth.issueToken(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: this.secureCookie,
      maxAge: 30 * 24 * 60 * 60 * 1e3
    });
    res.status(status).json({ user });
  }
};

// server/controllers/GroupController.ts
import { z as z2 } from "zod";

// shared/domain/categories.ts
var CATEGORIES = {
  food: { label: "\u0E01\u0E34\u0E19\u0E14\u0E37\u0E48\u0E21", icon: "\u{1F35C}" },
  travel: { label: "\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07", icon: "\u{1F697}" },
  stay: { label: "\u0E17\u0E35\u0E48\u0E1E\u0E31\u0E01", icon: "\u{1F3E8}" },
  shop: { label: "\u0E0B\u0E37\u0E49\u0E2D\u0E02\u0E2D\u0E07", icon: "\u{1F6CD}\uFE0F" },
  fun: { label: "\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E40\u0E25\u0E48\u0E19", icon: "\u{1F3A1}" },
  other: { label: "\u0E2D\u0E37\u0E48\u0E19 \u0E46", icon: "\u{1F9FE}" }
};

// server/controllers/GroupController.ts
var satang = z2.number().int().min(0).max(1e11);
var ids = z2.array(z2.string().max(64)).max(100);
var weights = (value) => z2.record(z2.string().max(64), value);
var splitBody = z2.discriminatedUnion("kind", [
  z2.object({ kind: z2.literal("equal"), participantIds: ids }),
  z2.object({ kind: z2.literal("exact"), amounts: weights(satang) }),
  z2.object({ kind: z2.literal("percent"), percents: weights(z2.number().min(0).max(100)) }),
  z2.object({ kind: z2.literal("shares"), shares: weights(z2.number().min(0).max(1e3)) }),
  z2.object({
    kind: z2.literal("itemized"),
    items: z2.array(z2.object({ name: z2.string().max(80), priceSatang: satang, participantIds: ids })).max(200),
    servicePct: z2.number().min(0).max(100),
    vatPct: z2.number().min(0).max(100)
  })
]);
var expenseBody = z2.object({
  title: z2.string().max(80),
  category: z2.string().refine((c) => c in CATEGORIES, "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"),
  amountSatang: satang,
  payerId: z2.string().max(64),
  split: splitBody,
  date: z2.iso.datetime().optional()
});
var nameBody = z2.object({ name: z2.string().max(60) });
var memberBody = z2.object({ name: z2.string().max(30), promptPayId: z2.string().max(20).optional() });
var paymentBody = z2.object({ fromId: z2.string().max(64), toId: z2.string().max(64), amountSatang: satang });
var joinBody = z2.object({ memberId: z2.string().max(64).optional() });
var GroupController = class _GroupController extends BaseController {
  constructor(auth, groups) {
    super();
    this.auth = auth;
    this.groups = groups;
  }
  auth;
  groups;
  registerRoutes() {
    const r = this.router;
    r.get("/invites/:code", this.preview);
    r.use(requireAuth(this.auth));
    r.post("/invites/:code/join", this.join);
    r.get("/groups", this.list);
    r.post("/groups", this.create);
    r.get("/groups/:id", this.get);
    r.patch("/groups/:id", this.rename);
    r.delete("/groups/:id", this.remove);
    r.post("/groups/:id/members", this.addMember);
    r.put("/groups/:id/members/:memberId", this.updateMember);
    r.delete("/groups/:id/members/:memberId", this.removeMember);
    r.post("/groups/:id/expenses", this.addExpense);
    r.put("/groups/:id/expenses/:txId", this.updateExpense);
    r.post("/groups/:id/payments", this.addPayment);
    r.delete("/groups/:id/transactions/:txId", this.removeTransaction);
  }
  static user(req) {
    return req.user;
  }
  static param(req, key) {
    return String(req.params[key]);
  }
  static send(res, group, status = 200) {
    res.status(status).json({ group: group.toJSON() });
  }
  /** ดูลิงก์เชิญได้โดยยังไม่ล็อกอิน จึงส่งเฉพาะชื่อกลุ่มและชื่อสมาชิก */
  preview = async (req, res) => {
    const group = await this.groups.previewInvite(_GroupController.param(req, "code"));
    res.json({
      name: group.name,
      members: group.listMembers().map((m) => ({ id: m.id, name: m.name, linked: m.isLinked() }))
    });
  };
  join = async (req, res) => {
    const { memberId } = joinBody.parse(req.body ?? {});
    _GroupController.send(res, await this.groups.join(_GroupController.user(req), _GroupController.param(req, "code"), memberId));
  };
  list = async (req, res) => {
    const groups = await this.groups.listFor(_GroupController.user(req));
    res.json({ groups: groups.map((g) => g.toJSON()) });
  };
  create = async (req, res) => {
    _GroupController.send(res, await this.groups.create(_GroupController.user(req), nameBody.parse(req.body).name), 201);
  };
  get = async (req, res) => {
    _GroupController.send(res, await this.groups.get(_GroupController.user(req), _GroupController.param(req, "id")));
  };
  rename = async (req, res) => {
    _GroupController.send(res, await this.groups.rename(_GroupController.user(req), _GroupController.param(req, "id"), nameBody.parse(req.body).name));
  };
  remove = async (req, res) => {
    await this.groups.delete(_GroupController.user(req), _GroupController.param(req, "id"));
    res.status(204).end();
  };
  addMember = async (req, res) => {
    const { name, promptPayId } = memberBody.parse(req.body);
    _GroupController.send(res, await this.groups.addMember(_GroupController.user(req), _GroupController.param(req, "id"), name, promptPayId), 201);
  };
  updateMember = async (req, res) => {
    const { name, promptPayId } = memberBody.parse(req.body);
    _GroupController.send(res, await this.groups.updateMember(_GroupController.user(req), _GroupController.param(req, "id"), _GroupController.param(req, "memberId"), name, promptPayId));
  };
  removeMember = async (req, res) => {
    _GroupController.send(res, await this.groups.removeMember(_GroupController.user(req), _GroupController.param(req, "id"), _GroupController.param(req, "memberId")));
  };
  addExpense = async (req, res) => {
    _GroupController.send(res, await this.groups.saveExpense(_GroupController.user(req), _GroupController.param(req, "id"), expenseBody.parse(req.body)), 201);
  };
  updateExpense = async (req, res) => {
    _GroupController.send(res, await this.groups.saveExpense(_GroupController.user(req), _GroupController.param(req, "id"), expenseBody.parse(req.body), _GroupController.param(req, "txId")));
  };
  addPayment = async (req, res) => {
    const { fromId, toId, amountSatang } = paymentBody.parse(req.body);
    _GroupController.send(res, await this.groups.recordPayment(_GroupController.user(req), _GroupController.param(req, "id"), fromId, toId, amountSatang), 201);
  };
  removeTransaction = async (req, res) => {
    _GroupController.send(res, await this.groups.removeTransaction(_GroupController.user(req), _GroupController.param(req, "id"), _GroupController.param(req, "txId")));
  };
};

// server/middleware/errorHandler.ts
import { ZodError } from "zod";

// shared/domain/DomainError.ts
var DomainError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DomainError";
  }
};

// server/middleware/errorHandler.ts
function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
  } else if (error instanceof DomainError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof ZodError) {
    res.status(400).json({ error: error.issues[0]?.message ?? "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" });
  } else {
    console.error(error);
    res.status(500).json({ error: "\u0E23\u0E30\u0E1A\u0E1A\u0E02\u0E31\u0E14\u0E02\u0E49\u0E2D\u0E07 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07" });
  }
}

// server/services/AuthService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var AuthService = class _AuthService {
  constructor(users, jwtSecret) {
    this.users = users;
    this.jwtSecret = jwtSecret;
  }
  users;
  jwtSecret;
  static HASH_ROUNDS = 10;
  static TOKEN_DAYS = 30;
  async register(email, password, name) {
    if (password.length < 8) throw new BadRequestError("\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 8 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    const passwordHash = await bcrypt.hash(password, _AuthService.HASH_ROUNDS);
    return this.toPublic(await this.users.create({ email: _AuthService.normalize(email), name: name.trim(), passwordHash }));
  }
  async login(email, password) {
    const user = await this.users.findByEmail(_AuthService.normalize(email));
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      throw new UnauthorizedError("\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    }
    return this.toPublic(user);
  }
  issueToken(user) {
    return jwt.sign({ sub: user.id }, this.jwtSecret, { expiresIn: `${_AuthService.TOKEN_DAYS}d`, algorithm: "HS256" });
  }
  async verifyToken(token) {
    let userId;
    try {
      userId = String(jwt.verify(token, this.jwtSecret, { algorithms: ["HS256"] }).sub);
    } catch {
      throw new UnauthorizedError("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48");
    }
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48");
    return this.toPublic(user);
  }
  static normalize(email) {
    return email.trim().toLowerCase();
  }
  toPublic(user) {
    return { id: user.id, email: user.email, name: user.name };
  }
};

// server/services/GroupService.ts
import { randomBytes, randomUUID } from "node:crypto";

// shared/domain/Money.ts
var Money = class _Money {
  satang;
  constructor(satang2) {
    if (!Number.isSafeInteger(satang2)) throw new DomainError("\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    this.satang = satang2;
  }
  static ZERO = new _Money(0);
  static fromSatang(satang2) {
    return new _Money(satang2);
  }
  static fromBaht(baht) {
    return new _Money(Math.round(baht * 100));
  }
  /** แปลงข้อความที่ผู้ใช้กรอก เช่น "1,250.50" */
  static parse(text) {
    const clean = text.replace(/,/g, "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new DomainError("\u0E01\u0E23\u0E2D\u0E01\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 \u0E17\u0E28\u0E19\u0E34\u0E22\u0E21\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 2 \u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07");
    return _Money.fromBaht(Number(clean));
  }
  static sum(items) {
    return items.reduce((total, item) => total.plus(item), _Money.ZERO);
  }
  plus(other) {
    return new _Money(this.satang + other.satang);
  }
  minus(other) {
    return new _Money(this.satang - other.satang);
  }
  negate() {
    return new _Money(-this.satang);
  }
  abs() {
    return new _Money(Math.abs(this.satang));
  }
  min(other) {
    return this.satang <= other.satang ? this : other;
  }
  isZero() {
    return this.satang === 0;
  }
  isPositive() {
    return this.satang > 0;
  }
  isNegative() {
    return this.satang < 0;
  }
  equals(other) {
    return this.satang === other.satang;
  }
  compareTo(other) {
    return this.satang - other.satang;
  }
  toSatang() {
    return this.satang;
  }
  toBaht() {
    return this.satang / 100;
  }
  format() {
    return this.toBaht().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  /**
   * แบ่งเงินตามน้ำหนักด้วยวิธี Largest Remainder
   * ผลรวมของทุกส่วนเท่ากับยอดเดิมพอดีเสมอ ไม่มีสตางค์หาย
   */
  allocate(weights2) {
    const totalWeight = weights2.reduce((a, b) => a + b, 0);
    if (weights2.length === 0 || totalWeight <= 0 || weights2.some((w) => w < 0)) {
      throw new DomainError("\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E01\u0E32\u0E23\u0E41\u0E1A\u0E48\u0E07\u0E40\u0E07\u0E34\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    }
    const exact = weights2.map((w) => this.satang * w / totalWeight);
    const shares = exact.map(Math.floor);
    let left = this.satang - shares.reduce((a, b) => a + b, 0);
    const byRemainder = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; left > 0; i = (i + 1) % byRemainder.length, left--) {
      shares[byRemainder[i].index]++;
    }
    return shares.map((s) => new _Money(s));
  }
};

// shared/domain/Ledger.ts
var Ledger = class {
  balances = /* @__PURE__ */ new Map();
  constructor(memberIds) {
    memberIds.forEach((id) => this.balances.set(id, Money.ZERO));
  }
  record(debtorId, creditorId, amount) {
    this.balances.set(debtorId, this.balanceOf(debtorId).minus(amount));
    this.balances.set(creditorId, this.balanceOf(creditorId).plus(amount));
  }
  balanceOf(memberId) {
    return this.balances.get(memberId) ?? Money.ZERO;
  }
  entries() {
    return [...this.balances.entries()];
  }
};

// shared/domain/PromptPayPayload.ts
function isValidPromptPayTarget(target) {
  return /^(0\d{9}|\d{13}|\d{15})$/.test(target);
}

// shared/domain/Member.ts
var Member = class _Member {
  constructor(id, name, color, userId, promptPayId) {
    this.id = id;
    this.color = color;
    this.rename(name);
    this._userId = userId;
    this.setPromptPay(promptPayId);
  }
  id;
  color;
  _name = "";
  _userId;
  _promptPayId;
  get name() {
    return this._name;
  }
  get userId() {
    return this._userId;
  }
  get promptPayId() {
    return this._promptPayId;
  }
  rename(name) {
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 30) throw new DomainError("\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 1 \u0E16\u0E36\u0E07 30 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    this._name = clean;
  }
  setPromptPay(target) {
    const clean = target?.replace(/\D/g, "");
    if (clean && !isValidPromptPayTarget(clean)) {
      throw new DomainError("\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1E\u0E22\u0E4C\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D 10 \u0E2B\u0E25\u0E31\u0E01 \u0E40\u0E25\u0E02\u0E1A\u0E31\u0E15\u0E23\u0E1B\u0E23\u0E30\u0E0A\u0E32\u0E0A\u0E19 13 \u0E2B\u0E25\u0E31\u0E01 \u0E2B\u0E23\u0E37\u0E2D e-Wallet 15 \u0E2B\u0E25\u0E31\u0E01");
    }
    this._promptPayId = clean || void 0;
  }
  linkUser(userId) {
    if (this._userId && this._userId !== userId) throw new DomainError("\u0E0A\u0E37\u0E48\u0E2D\u0E19\u0E35\u0E49\u0E21\u0E35\u0E04\u0E19\u0E43\u0E0A\u0E49\u0E41\u0E25\u0E49\u0E27");
    this._userId = userId;
  }
  isLinked() {
    return this._userId !== void 0;
  }
  toJSON() {
    return { id: this.id, name: this._name, color: this.color, userId: this._userId, promptPayId: this._promptPayId };
  }
  static fromJSON(data) {
    return new _Member(data.id, data.name, data.color, data.userId, data.promptPayId);
  }
};

// shared/domain/settlement/SettlementStrategy.ts
var SettlementStrategy = class {
};

// shared/domain/settlement/DirectSettlement.ts
var DirectSettlement = class extends SettlementStrategy {
  plan(_memberIds, transactions) {
    const net = /* @__PURE__ */ new Map();
    const key = (a, b) => `${a}|${b}`;
    for (const tx of transactions) {
      for (const { debtorId, creditorId, amount } of tx.debts()) {
        const k = key(debtorId, creditorId);
        const opposite = key(creditorId, debtorId);
        const existing = net.get(opposite);
        if (existing) {
          const left = existing.minus(amount);
          net.delete(opposite);
          if (left.isPositive()) net.set(opposite, left);
          else if (left.isNegative()) net.set(k, left.abs());
        } else {
          net.set(k, (net.get(k) ?? Money.ZERO).plus(amount));
        }
      }
    }
    return [...net.entries()].map(([k, amount]) => {
      const [fromId, toId] = k.split("|");
      return { fromId, toId, amount };
    });
  }
};

// shared/domain/settlement/GreedySettlement.ts
var GreedySettlement = class extends SettlementStrategy {
  plan(memberIds, transactions) {
    const ledger = new Ledger(memberIds);
    transactions.forEach((tx) => tx.applyTo(ledger));
    const creditors = ledger.entries().filter(([, b]) => b.isPositive());
    const debtors = ledger.entries().filter(([, b]) => b.isNegative()).map(([id, b]) => [id, b.abs()]);
    const largestFirst = (a, b) => b[1].compareTo(a[1]);
    const transfers = [];
    while (creditors.length > 0 && debtors.length > 0) {
      creditors.sort(largestFirst);
      debtors.sort(largestFirst);
      const [toId, credit] = creditors[0];
      const [fromId, debt] = debtors[0];
      const amount = credit.min(debt);
      transfers.push({ fromId, toId, amount });
      creditors[0] = [toId, credit.minus(amount)];
      debtors[0] = [fromId, debt.minus(amount)];
      if (creditors[0][1].isZero()) creditors.shift();
      if (debtors[0][1].isZero()) debtors.shift();
    }
    return transfers;
  }
};

// shared/domain/transaction/Transaction.ts
var Transaction = class {
  constructor(id, date, createdBy) {
    this.id = id;
    this.date = date;
    this.createdBy = createdBy;
  }
  id;
  date;
  createdBy;
  applyTo(ledger) {
    for (const debt of this.debts()) {
      ledger.record(debt.debtorId, debt.creditorId, debt.amount);
    }
  }
};

// shared/domain/transaction/Expense.ts
var Expense = class extends Transaction {
  title;
  category;
  amount;
  payerId;
  split;
  // Composition: ค่าใช้จ่ายมีวิธีหารของตัวเอง
  constructor(props) {
    super(props.id, props.date, props.createdBy);
    this.title = props.title.trim();
    if (!this.title) throw new DomainError("\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
    this.amount = props.split.resolveTotal(props.amount);
    if (!this.amount.isPositive()) throw new DomainError("\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0");
    this.category = props.category;
    this.payerId = props.payerId;
    this.split = props.split;
    this.split.split(this.amount);
  }
  shares() {
    return this.split.split(this.amount);
  }
  debts() {
    return [...this.shares()].filter(([id, share]) => id !== this.payerId && share.isPositive()).map(([id, share]) => ({ debtorId: id, creditorId: this.payerId, amount: share }));
  }
  involves(memberId) {
    return this.payerId === memberId || this.split.participantIds().includes(memberId);
  }
  toJSON() {
    return {
      type: "expense",
      id: this.id,
      date: this.date,
      createdBy: this.createdBy,
      title: this.title,
      category: this.category,
      amountSatang: this.amount.toSatang(),
      payerId: this.payerId,
      split: this.split.toJSON()
    };
  }
};

// shared/domain/split/SplitStrategy.ts
var SplitStrategy = class {
  /** ยอดรวมของบิล วิธีส่วนใหญ่ใช้ยอดที่ผู้ใช้กรอก */
  resolveTotal(given) {
    return given;
  }
  /** คำนวณส่วนของแต่ละคน แล้วตรวจว่ารวมกันเท่ายอดบิลพอดี */
  split(total) {
    if (this.participantIds().length === 0) throw new DomainError("\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E19\u0E23\u0E48\u0E27\u0E21\u0E2B\u0E32\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E04\u0E19");
    const shares = this.computeShares(total);
    if (!Money.sum([...shares.values()]).equals(total)) {
      throw new DomainError(`\u0E22\u0E2D\u0E14\u0E02\u0E2D\u0E07\u0E41\u0E15\u0E48\u0E25\u0E30\u0E04\u0E19\u0E23\u0E27\u0E21\u0E01\u0E31\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A ${total.format()} \u0E1A\u0E32\u0E17`);
    }
    return shares;
  }
  /** ใช้โดยคลาสลูก: แบ่งยอดตามน้ำหนักให้สมาชิกแต่ละคน */
  allocateByWeight(total, ids2, weights2) {
    const parts = total.allocate(weights2);
    return new Map(ids2.map((id, i) => [id, parts[i]]));
  }
};

// shared/domain/split/EqualSplit.ts
var EqualSplit = class extends SplitStrategy {
  constructor(ids2) {
    super();
    this.ids = ids2;
  }
  ids;
  kind = "equal";
  label = "\u0E2B\u0E32\u0E23\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E19";
  participantIds() {
    return [...this.ids];
  }
  computeShares(total) {
    return this.allocateByWeight(total, this.ids, this.ids.map(() => 1));
  }
  toJSON() {
    return { kind: "equal", participantIds: [...this.ids] };
  }
};

// shared/domain/split/ExactSplit.ts
var ExactSplit = class extends SplitStrategy {
  constructor(amounts) {
    super();
    this.amounts = amounts;
  }
  amounts;
  kind = "exact";
  label = "\u0E23\u0E30\u0E1A\u0E38\u0E22\u0E2D\u0E14\u0E40\u0E2D\u0E07";
  participantIds() {
    return Object.keys(this.amounts);
  }
  computeShares() {
    return new Map(Object.entries(this.amounts).map(([id, satang2]) => [id, Money.fromSatang(satang2)]));
  }
  toJSON() {
    return { kind: "exact", amounts: { ...this.amounts } };
  }
};

// shared/domain/split/ItemizedSplit.ts
var ItemizedSplit = class extends SplitStrategy {
  constructor(items, servicePct, vatPct) {
    super();
    this.items = items;
    this.servicePct = servicePct;
    this.vatPct = vatPct;
    if (items.length === 0) throw new DomainError("\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23");
    if (items.some((item) => item.participantIds.length === 0)) {
      throw new DomainError("\u0E17\u0E38\u0E01\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E19\u0E23\u0E48\u0E27\u0E21\u0E08\u0E48\u0E32\u0E22\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E04\u0E19");
    }
  }
  items;
  servicePct;
  vatPct;
  kind = "itemized";
  label = "\u0E41\u0E22\u0E01\u0E15\u0E32\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23";
  participantIds() {
    return [...new Set(this.items.flatMap((item) => item.participantIds))];
  }
  /** ยอดรวมคำนวณจากรายการเอง: Service คิดจากยอดอาหาร และ VAT คิดจากยอดรวม Service */
  resolveTotal() {
    const subtotal = this.items.reduce((sum, item) => sum + item.priceSatang, 0);
    return Money.fromSatang(Math.round(subtotal * (1 + this.servicePct / 100) * (1 + this.vatPct / 100)));
  }
  computeShares(total) {
    const before = /* @__PURE__ */ new Map();
    for (const item of this.items) {
      const parts = Money.fromSatang(item.priceSatang).allocate(item.participantIds.map(() => 1));
      item.participantIds.forEach((id, i) => {
        before.set(id, (before.get(id) ?? 0) + parts[i].toSatang());
      });
    }
    return this.allocateByWeight(total, [...before.keys()], [...before.values()]);
  }
  toJSON() {
    return { kind: "itemized", items: this.items, servicePct: this.servicePct, vatPct: this.vatPct };
  }
};

// shared/domain/split/PercentSplit.ts
var PercentSplit = class extends SplitStrategy {
  constructor(percents) {
    super();
    this.percents = percents;
  }
  percents;
  kind = "percent";
  label = "\u0E15\u0E32\u0E21\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E40\u0E0B\u0E47\u0E19\u0E15\u0E4C";
  participantIds() {
    return Object.keys(this.percents);
  }
  computeShares(total) {
    const values = Object.values(this.percents);
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 1e-3) throw new DomainError(`\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E40\u0E0B\u0E47\u0E19\u0E15\u0E4C\u0E23\u0E27\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E14\u0E49 100 \u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49 ${sum}`);
    return this.allocateByWeight(total, this.participantIds(), values);
  }
  toJSON() {
    return { kind: "percent", percents: { ...this.percents } };
  }
};

// shared/domain/split/ShareSplit.ts
var ShareSplit = class extends SplitStrategy {
  constructor(shares) {
    super();
    this.shares = shares;
  }
  shares;
  kind = "shares";
  label = "\u0E15\u0E32\u0E21\u0E2A\u0E48\u0E27\u0E19\u0E41\u0E1A\u0E48\u0E07";
  participantIds() {
    return Object.keys(this.shares);
  }
  computeShares(total) {
    return this.allocateByWeight(total, this.participantIds(), Object.values(this.shares));
  }
  toJSON() {
    return { kind: "shares", shares: { ...this.shares } };
  }
};

// shared/domain/split/SplitFactory.ts
function createSplit(data) {
  switch (data.kind) {
    case "equal":
      return new EqualSplit(data.participantIds);
    case "exact":
      return new ExactSplit(data.amounts);
    case "percent":
      return new PercentSplit(data.percents);
    case "shares":
      return new ShareSplit(data.shares);
    case "itemized":
      return new ItemizedSplit(data.items, data.servicePct, data.vatPct);
  }
}

// shared/domain/transaction/Payment.ts
var Payment = class extends Transaction {
  constructor(id, date, createdBy, fromId, toId, amount) {
    super(id, date, createdBy);
    this.fromId = fromId;
    this.toId = toId;
    this.amount = amount;
    if (fromId === toId) throw new DomainError("\u0E1C\u0E39\u0E49\u0E42\u0E2D\u0E19\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E19\u0E25\u0E30\u0E04\u0E19");
    if (!amount.isPositive()) throw new DomainError("\u0E22\u0E2D\u0E14\u0E42\u0E2D\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 0");
  }
  fromId;
  toId;
  amount;
  debts() {
    return [{ debtorId: this.toId, creditorId: this.fromId, amount: this.amount }];
  }
  involves(memberId) {
    return this.fromId === memberId || this.toId === memberId;
  }
  toJSON() {
    return {
      type: "payment",
      id: this.id,
      date: this.date,
      createdBy: this.createdBy,
      fromId: this.fromId,
      toId: this.toId,
      amountSatang: this.amount.toSatang()
    };
  }
};

// shared/domain/transaction/TransactionFactory.ts
function createTransaction(data) {
  if (data.type === "expense") {
    return new Expense({
      id: data.id,
      date: data.date,
      createdBy: data.createdBy,
      title: data.title,
      category: data.category,
      amount: Money.fromSatang(data.amountSatang),
      payerId: data.payerId,
      split: createSplit(data.split)
    });
  }
  return new Payment(data.id, data.date, data.createdBy, data.fromId, data.toId, Money.fromSatang(data.amountSatang));
}

// shared/domain/Group.ts
var Group = class _Group {
  constructor(id, name, ownerId, inviteCode, version, createdAt) {
    this.id = id;
    this.ownerId = ownerId;
    this.inviteCode = inviteCode;
    this.version = version;
    this.createdAt = createdAt;
    this.rename(name);
  }
  id;
  ownerId;
  inviteCode;
  version;
  createdAt;
  _name = "";
  members = /* @__PURE__ */ new Map();
  transactions = /* @__PURE__ */ new Map();
  get name() {
    return this._name;
  }
  rename(name) {
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 60) throw new DomainError("\u0E0A\u0E37\u0E48\u0E2D\u0E01\u0E25\u0E38\u0E48\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 1 \u0E16\u0E36\u0E07 60 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    this._name = clean;
  }
  listMembers() {
    return [...this.members.values()];
  }
  listTransactions() {
    return [...this.transactions.values()].sort((a, b) => b.date.localeCompare(a.date));
  }
  getMember(id) {
    const member = this.members.get(id);
    if (!member) throw new DomainError("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E04\u0E19\u0E19\u0E35\u0E49\u0E43\u0E19\u0E01\u0E25\u0E38\u0E48\u0E21");
    return member;
  }
  findMemberByUser(userId) {
    return this.listMembers().find((m) => m.userId === userId);
  }
  addMember(member) {
    if (this.listMembers().some((m) => m.name === member.name)) throw new DomainError(`\u0E21\u0E35\u0E0A\u0E37\u0E48\u0E2D "${member.name}" \u0E43\u0E19\u0E01\u0E25\u0E38\u0E48\u0E21\u0E41\u0E25\u0E49\u0E27`);
    this.members.set(member.id, member);
  }
  removeMember(id) {
    const member = this.getMember(id);
    if (member.userId === this.ownerId) throw new DomainError("\u0E25\u0E1A\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49");
    if (this.listTransactions().some((tx) => tx.involves(id))) {
      throw new DomainError(`\u0E25\u0E1A ${member.name} \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E40\u0E1E\u0E23\u0E32\u0E30\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E02\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48`);
    }
    this.members.delete(id);
  }
  /** เพิ่มหรือแทนที่รายการ โดยตรวจว่าทุกคนในรายการอยู่ในกลุ่มจริง */
  saveTransaction(tx) {
    for (const debt of tx.debts()) {
      this.getMember(debt.debtorId);
      this.getMember(debt.creditorId);
    }
    if (tx instanceof Expense) this.getMember(tx.payerId);
    this.transactions.set(tx.id, tx);
  }
  removeTransaction(id) {
    if (!this.transactions.delete(id)) throw new DomainError("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49");
  }
  ledger() {
    const ledger = new Ledger(this.listMembers().map((m) => m.id));
    this.transactions.forEach((tx) => tx.applyTo(ledger));
    return ledger;
  }
  /** Polymorphism: เปลี่ยนวิธีคำนวณการโอนได้โดยส่งคลาสลูกตัวอื่นเข้ามา */
  settle(strategy = new GreedySettlement()) {
    return strategy.plan(this.listMembers().map((m) => m.id), this.listTransactions());
  }
  /** จำนวนครั้งที่ต้องโอนถ้าไม่ได้ลดการโอน */
  directTransferCount() {
    return this.settle(new DirectSettlement()).length;
  }
  expenses() {
    return this.listTransactions().filter((tx) => tx instanceof Expense);
  }
  totalSpent() {
    return Money.sum(this.expenses().map((e) => e.amount));
  }
  /** ยอดที่แต่ละคนใช้จริง (ส่วนของตัวเอง ไม่นับที่ออกให้คนอื่น) */
  spentByMember() {
    const spent = new Map(this.listMembers().map((m) => [m.id, Money.ZERO]));
    for (const expense of this.expenses()) {
      for (const [id, share] of expense.shares()) spent.set(id, (spent.get(id) ?? Money.ZERO).plus(share));
    }
    return spent;
  }
  spentByCategory() {
    const spent = /* @__PURE__ */ new Map();
    for (const e of this.expenses()) spent.set(e.category, (spent.get(e.category) ?? Money.ZERO).plus(e.amount));
    return spent;
  }
  isSettled() {
    return this.expenses().length > 0 && this.ledger().entries().every(([, b]) => b.isZero());
  }
  toJSON() {
    return {
      id: this.id,
      name: this._name,
      ownerId: this.ownerId,
      inviteCode: this.inviteCode,
      version: this.version,
      createdAt: this.createdAt,
      members: this.listMembers().map((m) => m.toJSON()),
      transactions: this.listTransactions().map((t) => t.toJSON())
    };
  }
  static fromJSON(data) {
    const group = new _Group(data.id, data.name, data.ownerId, data.inviteCode, data.version, data.createdAt);
    data.members.forEach((m) => group.members.set(m.id, Member.fromJSON(m)));
    data.transactions.forEach((t) => group.transactions.set(t.id, createTransaction(t)));
    return group;
  }
};

// server/services/GroupService.ts
var GroupService = class _GroupService {
  constructor(groups) {
    this.groups = groups;
  }
  groups;
  static MAX_RETRY = 3;
  static COLORS = 8;
  async create(user, name) {
    const owner = new Member(randomUUID(), user.name, 0, user.id);
    const probe = new Group("new", name, user.id, "new", 0, "");
    return this.groups.create({
      name: probe.name,
      ownerId: user.id,
      inviteCode: randomBytes(6).toString("base64url"),
      members: [owner.toJSON()],
      transactions: []
    });
  }
  listFor(user) {
    return this.groups.findByUser(user.id);
  }
  async get(user, groupId) {
    const group = await this.groups.findById(groupId);
    if (!group || !group.findMemberByUser(user.id)) throw new NotFoundError("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21\u0E19\u0E35\u0E49 \u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01");
    return group;
  }
  async previewInvite(code) {
    const group = await this.groups.findByInviteCode(code);
    if (!group) throw new NotFoundError("\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E40\u0E0A\u0E34\u0E0D\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E49\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49");
    return group;
  }
  /** เข้ากลุ่มด้วยลิงก์เชิญ โดยเลือกชื่อที่เพื่อนเพิ่มไว้แล้ว หรือสร้างชื่อใหม่ */
  async join(user, code, memberId) {
    const invited = await this.previewInvite(code);
    if (invited.findMemberByUser(user.id)) return invited;
    return this.mutate(user, invited.id, (group) => {
      if (memberId) {
        group.getMember(memberId).linkUser(user.id);
      } else {
        group.addMember(new Member(randomUUID(), user.name, group.listMembers().length % _GroupService.COLORS, user.id));
      }
    }, false);
  }
  rename(user, groupId, name) {
    return this.mutate(user, groupId, (group) => group.rename(name));
  }
  async delete(user, groupId) {
    const group = await this.get(user, groupId);
    if (group.ownerId !== user.id) throw new ForbiddenError("\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48\u0E25\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21\u0E44\u0E14\u0E49");
    await this.groups.delete(group.id);
  }
  addMember(user, groupId, name, promptPayId) {
    return this.mutate(user, groupId, (group) => {
      group.addMember(new Member(randomUUID(), name, group.listMembers().length % _GroupService.COLORS, void 0, promptPayId));
    });
  }
  /** ชื่อและพร้อมเพย์ของคนที่มีบัญชีแล้ว เจ้าตัวเท่านั้นที่แก้ได้ กันการเปลี่ยนเลขบัญชีรับเงินของคนอื่น */
  updateMember(user, groupId, memberId, name, promptPayId) {
    return this.mutate(user, groupId, (group) => {
      const member = group.getMember(memberId);
      if (member.userId && member.userId !== user.id) throw new ForbiddenError("\u0E41\u0E01\u0E49\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07");
      if (group.listMembers().some((m) => m.id !== memberId && m.name === name.trim())) {
        throw new DomainError(`\u0E21\u0E35\u0E0A\u0E37\u0E48\u0E2D "${name.trim()}" \u0E43\u0E19\u0E01\u0E25\u0E38\u0E48\u0E21\u0E41\u0E25\u0E49\u0E27`);
      }
      member.rename(name);
      member.setPromptPay(promptPayId);
    });
  }
  removeMember(user, groupId, memberId) {
    return this.mutate(user, groupId, (group) => group.removeMember(memberId));
  }
  saveExpense(user, groupId, input, existingId) {
    return this.mutate(user, groupId, (group) => {
      const previous = group.listTransactions().find((tx) => tx.id === existingId);
      if (existingId) group.removeTransaction(existingId);
      group.saveTransaction(new Expense({
        id: existingId ?? randomUUID(),
        date: input.date ?? previous?.date ?? (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: previous?.createdBy ?? user.id,
        title: input.title,
        category: input.category,
        amount: Money.fromSatang(input.amountSatang),
        payerId: input.payerId,
        split: createSplit(input.split)
      }));
    });
  }
  recordPayment(user, groupId, fromId, toId, amountSatang) {
    return this.mutate(user, groupId, (group) => {
      group.saveTransaction(new Payment(randomUUID(), (/* @__PURE__ */ new Date()).toISOString(), user.id, fromId, toId, Money.fromSatang(amountSatang)));
    });
  }
  removeTransaction(user, groupId, transactionId) {
    return this.mutate(user, groupId, (group) => group.removeTransaction(transactionId));
  }
  /** อ่าน แก้ แล้วบันทึก ถ้ามีคนแก้พร้อมกันจะอ่านใหม่แล้วลองอีกครั้ง */
  async mutate(user, groupId, change, requireMember = true) {
    for (let attempt = 0; attempt < _GroupService.MAX_RETRY; attempt++) {
      const group = requireMember ? await this.get(user, groupId) : await this.groups.findById(groupId);
      if (!group) throw new NotFoundError("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21\u0E19\u0E35\u0E49");
      change(group);
      if (await this.groups.save(group)) return await this.groups.findById(groupId);
    }
    throw new ConflictError("\u0E21\u0E35\u0E04\u0E19\u0E41\u0E01\u0E49\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E01\u0E31\u0E19 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07");
  }
};

// server/app.ts
function createApp(options) {
  const app2 = express();
  const auth = new AuthService(options.users, options.jwtSecret);
  const groups = new GroupService(options.groups);
  app2.set("trust proxy", 1);
  app2.use(helmet());
  app2.use(express.json({ limit: "200kb" }));
  app2.use(cookieParser());
  app2.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app2.use("/api/auth", new AuthController(auth, options.isProduction, options.rateLimitMax ?? 30).build());
  app2.use("/api", new GroupController(auth, groups).build());
  app2.use("/api", (_req, res) => {
    res.status(404).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A API \u0E19\u0E35\u0E49" });
  });
  if (options.clientDir) {
    const clientDir = options.clientDir;
    app2.use(express.static(clientDir));
    app2.get(/.*/, (_req, res) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }
  app2.use(errorHandler);
  return app2;
}

// server/config.ts
var Config = class _Config {
  mongoUri;
  jwtSecret;
  port;
  isProduction;
  constructor(env = process.env) {
    this.mongoUri = _Config.required(env, "MONGODB_URI");
    this.jwtSecret = _Config.required(env, "JWT_SECRET");
    if (this.jwtSecret.length < 32) throw new Error("JWT_SECRET \u0E15\u0E49\u0E2D\u0E07\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 32 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
    this.port = Number(env.PORT ?? 3e3);
    this.isProduction = env.NODE_ENV === "production";
  }
  static required(env, key) {
    const value = env[key];
    if (!value) throw new Error(`\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 ${key} (\u0E14\u0E39\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48 .env.example)`);
    return value;
  }
};

// server/repositories/MongoRepositories.ts
import { isValidObjectId } from "mongoose";

// server/models/schemas.ts
import mongoose, { Schema } from "mongoose";
var userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });
var memberSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: Number, required: true },
  userId: String,
  promptPayId: String
}, { _id: false });
var groupSchema = new Schema({
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  version: { type: Number, required: true, default: 0 },
  members: { type: [memberSchema], default: [] },
  transactions: { type: [Schema.Types.Mixed], default: [] }
}, { timestamps: true, minimize: false });
groupSchema.index({ "members.userId": 1 });
var UserModel = mongoose.model("User", userSchema);
var GroupModel = mongoose.model("Group", groupSchema);

// server/repositories/MongoRepositories.ts
var MongoUserRepository = class {
  async create(data) {
    try {
      const doc = await UserModel.create(data);
      return this.toRecord(doc);
    } catch (error) {
      if (error.code === 11e3) throw new ConflictError("\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E19\u0E35\u0E49\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27");
      throw error;
    }
  }
  async findByEmail(email) {
    const doc = await UserModel.findOne({ email: String(email) });
    return doc && this.toRecord(doc);
  }
  async findById(id) {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id);
    return doc && this.toRecord(doc);
  }
  toRecord(doc) {
    return { id: String(doc._id), email: doc.email, name: doc.name, passwordHash: doc.passwordHash };
  }
};
var MongoGroupRepository = class {
  async create(data) {
    const doc = await GroupModel.create({ ...data, version: 0 });
    return this.toGroup(doc);
  }
  async findById(id) {
    if (!isValidObjectId(id)) return null;
    const doc = await GroupModel.findById(id).lean();
    return doc && this.toGroup(doc);
  }
  async findByInviteCode(code) {
    const doc = await GroupModel.findOne({ inviteCode: String(code) }).lean();
    return doc && this.toGroup(doc);
  }
  async findByUser(userId) {
    const docs = await GroupModel.find({ "members.userId": String(userId) }).sort({ updatedAt: -1 }).lean();
    return docs.map((doc) => this.toGroup(doc));
  }
  /** Optimistic Locking: บันทึกได้ก็ต่อเมื่อ version ยังตรงกับตอนที่อ่านมา */
  async save(group) {
    const { name, members, transactions } = group.toJSON();
    const result = await GroupModel.updateOne(
      { _id: group.id, version: group.version },
      { $set: { name, members, transactions }, $inc: { version: 1 } }
    );
    return result.matchedCount === 1;
  }
  async delete(id) {
    await GroupModel.deleteOne({ _id: id });
  }
  toGroup(doc) {
    return Group.fromJSON({
      id: String(doc._id),
      name: doc.name,
      ownerId: doc.ownerId,
      inviteCode: doc.inviteCode,
      version: doc.version,
      createdAt: new Date(doc.createdAt).toISOString(),
      members: doc.members,
      transactions: doc.transactions
    });
  }
};

// server/serverless.ts
var config = new Config();
var app = createApp({
  users: new MongoUserRepository(),
  groups: new MongoGroupRepository(),
  jwtSecret: config.jwtSecret,
  isProduction: config.isProduction
});
var connection;
function connect() {
  connection ??= mongoose2.connect(config.mongoUri, { serverSelectionTimeoutMS: 8e3 }).catch((error) => {
    connection = void 0;
    throw error;
  });
  return connection;
}
function originalUrl(url) {
  const parsed = new URL(url, "http://local");
  const path2 = parsed.searchParams.get("path");
  if (parsed.pathname !== "/api" || !path2) return url;
  parsed.searchParams.delete("path");
  return `/api/${path2}${parsed.search}`;
}
async function handler(req, res) {
  try {
    await connect();
  } catch (error) {
    console.error(error);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07" }));
    return;
  }
  req.url = originalUrl(req.url ?? "/");
  app(req, res);
}
export {
  handler as default
};
