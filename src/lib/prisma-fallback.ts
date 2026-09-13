import fs from "fs";
import path from "path";

// @ts-ignore - node:sqlite is experimental and types may not be in @types/node 20
import { DatabaseSync } from "node:sqlite";

// Ensure DB directory exists
const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./dev.db";
const resolvedPath = path.resolve(process.cwd(), dbPath);
const dir = path.dirname(resolvedPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(resolvedPath);

// Enable WAL
try {
  db.exec("PRAGMA journal_mode=WAL;");
} catch {}

function cuid(): string {
  return "c" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      passwordHash TEXT NOT NULL,
      name TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Organization (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS OrganizationMember (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      organizationId TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      UNIQUE(userId, organizationId)
    );
    CREATE TABLE IF NOT EXISTS Lead (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      email TEXT,
      company TEXT,
      manager TEXT,
      product TEXT,
      dealValue REAL,
      dealStage TEXT,
      status TEXT,
      lastContactAt TEXT,
      source TEXT,
      rawData TEXT,
      lastMessage TEXT,
      isDemo INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS Conversation (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      leadId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS Message (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (conversationId) REFERENCES Conversation(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS Deal (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      leadId TEXT,
      title TEXT,
      value REAL,
      stage TEXT,
      status TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS AIAnalysis (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      leadId TEXT NOT NULL,
      leadStatus TEXT NOT NULL,
      buyingIntent TEXT NOT NULL,
      lossReason TEXT NOT NULL,
      recoveryScore INTEGER NOT NULL,
      recoveryProbability REAL,
      confidence TEXT NOT NULL,
      recommendedAction TEXT NOT NULL,
      reasoningSummary TEXT NOT NULL,
      recommendedMessageGoal TEXT,
      generatedMessage TEXT,
      modelVersion TEXT NOT NULL,
      factors TEXT,
      missingInformation TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS RecoveryOpportunity (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      leadId TEXT NOT NULL,
      dealId TEXT,
      score INTEGER NOT NULL,
      category TEXT NOT NULL,
      probability REAL,
      confidence TEXT NOT NULL,
      potentialRevenue REAL,
      status TEXT NOT NULL DEFAULT 'open',
      factors TEXT,
      reasoningSummary TEXT,
      recommendedAction TEXT,
      lastContactAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE CASCADE,
      FOREIGN KEY (dealId) REFERENCES Deal(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS Campaign (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      targetCriteria TEXT,
      createdById TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (createdById) REFERENCES User(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS CampaignLead (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      campaignId TEXT NOT NULL,
      leadId TEXT NOT NULL,
      status TEXT NOT NULL,
      messageGenerated TEXT,
      messageEdited TEXT,
      messageStatus TEXT,
      contactedAt TEXT,
      response TEXT,
      outcome TEXT,
      revenue REAL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (campaignId) REFERENCES Campaign(id) ON DELETE CASCADE,
      FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE CASCADE,
      UNIQUE(campaignId, leadId)
    );
    CREATE TABLE IF NOT EXISTS RecoveryEvent (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      leadId TEXT NOT NULL,
      opportunityId TEXT,
      campaignId TEXT,
      userId TEXT,
      type TEXT,
      outcome TEXT NOT NULL,
      revenue REAL,
      recoveredAt TEXT,
      source TEXT,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (leadId) REFERENCES Lead(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS ImportJob (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      status TEXT NOT NULL,
      totalRows INTEGER NOT NULL,
      processedRows INTEGER NOT NULL,
      createdCount INTEGER DEFAULT 0,
      updatedCount INTEGER DEFAULT 0,
      duplicateCount INTEGER DEFAULT 0,
      skippedCount INTEGER DEFAULT 0,
      errorCount INTEGER DEFAULT 0,
      errors TEXT,
      mapping TEXT,
      summary TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      userId TEXT,
      event TEXT NOT NULL,
      entityType TEXT,
      entityId TEXT,
      metadata TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lead_org ON Lead(organizationId);
    CREATE INDEX IF NOT EXISTS idx_lead_org_demo ON Lead(organizationId, isDemo);
    CREATE INDEX IF NOT EXISTS idx_lead_email ON Lead(email);
    CREATE INDEX IF NOT EXISTS idx_lead_phone ON Lead(phone);
    CREATE INDEX IF NOT EXISTS idx_analysis_org ON AIAnalysis(organizationId);
    CREATE INDEX IF NOT EXISTS idx_analysis_lead ON AIAnalysis(leadId);
    CREATE INDEX IF NOT EXISTS idx_analysis_score ON AIAnalysis(recoveryScore);
    CREATE INDEX IF NOT EXISTS idx_recoveryOpp_org ON RecoveryOpportunity(organizationId);
    CREATE INDEX IF NOT EXISTS idx_recoveryOpp_lead ON RecoveryOpportunity(leadId);
    CREATE INDEX IF NOT EXISTS idx_recoveryOpp_score ON RecoveryOpportunity(score);
    CREATE INDEX IF NOT EXISTS idx_campaign_org ON Campaign(organizationId);
    CREATE INDEX IF NOT EXISTS idx_campaignLead_org ON CampaignLead(organizationId);
    CREATE INDEX IF NOT EXISTS idx_campaignLead_campaign ON CampaignLead(campaignId);
    CREATE INDEX IF NOT EXISTS idx_campaignLead_lead ON CampaignLead(leadId);
    CREATE INDEX IF NOT EXISTS idx_recovery_org ON RecoveryEvent(organizationId);
    CREATE INDEX IF NOT EXISTS idx_recovery_lead ON RecoveryEvent(leadId);
    CREATE INDEX IF NOT EXISTS idx_audit_org ON AuditLog(organizationId);
    CREATE INDEX IF NOT EXISTS idx_audit_event ON AuditLog(event);
  `);

  // Migrations for existing DB - add columns if not exists (ignore errors)
  const migrations = [
    "ALTER TABLE AIAnalysis ADD COLUMN factors TEXT",
    "ALTER TABLE AIAnalysis ADD COLUMN missingInformation TEXT",
    "ALTER TABLE Campaign ADD COLUMN targetCriteria TEXT",
    "ALTER TABLE Campaign ADD COLUMN createdById TEXT",
    "ALTER TABLE CampaignLead ADD COLUMN messageEdited TEXT",
    "ALTER TABLE CampaignLead ADD COLUMN messageStatus TEXT",
    "ALTER TABLE RecoveryEvent ADD COLUMN opportunityId TEXT",
    "ALTER TABLE RecoveryEvent ADD COLUMN campaignId TEXT",
    "ALTER TABLE RecoveryEvent ADD COLUMN userId TEXT",
    "ALTER TABLE RecoveryEvent ADD COLUMN recoveredAt TEXT",
    "ALTER TABLE RecoveryEvent ADD COLUMN source TEXT",
    "ALTER TABLE ImportJob ADD COLUMN createdCount INTEGER DEFAULT 0",
    "ALTER TABLE ImportJob ADD COLUMN updatedCount INTEGER DEFAULT 0",
    "ALTER TABLE ImportJob ADD COLUMN duplicateCount INTEGER DEFAULT 0",
    "ALTER TABLE ImportJob ADD COLUMN skippedCount INTEGER DEFAULT 0",
    "ALTER TABLE ImportJob ADD COLUMN errorCount INTEGER DEFAULT 0",
    "ALTER TABLE ImportJob ADD COLUMN summary TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch {}
  }
}

initTables();

function parseLeadRow(row: any) {
  if (!row) return null;
  return {
    ...row,
    dealValue: row.dealValue !== null ? Number(row.dealValue) : null,
    isDemo: Boolean(row.isDemo),
    lastContactAt: row.lastContactAt ? new Date(row.lastContactAt) : null,
    createdAt: row.createdAt ? new Date(row.createdAt) : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
  };
}

function parseAnalysisRow(row: any) {
  if (!row) return null;
  return {
    ...row,
    recoveryScore: Number(row.recoveryScore),
    recoveryProbability: row.recoveryProbability !== null ? Number(row.recoveryProbability) : null,
    createdAt: row.createdAt ? new Date(row.createdAt) : null,
    factors: row.factors ? (()=>{ try{ return JSON.parse(row.factors); }catch{ return null; } })() : null,
    missingInformation: row.missingInformation ? (()=>{ try{ return JSON.parse(row.missingInformation); }catch{ return null; } })() : null,
  };
}

function parseGenericDates(row: any) {
  if (!row) return null;
  const out = { ...row };
  for (const k of ["createdAt", "updatedAt", "lastContactAt", "contactedAt", "recoveredAt"]) {
    if (out[k]) {
      try { out[k] = new Date(out[k]); } catch {}
    }
  }
  if (out.isDemo !== undefined) out.isDemo = Boolean(out.isDemo);
  if (out.dealValue !== undefined && out.dealValue !== null) out.dealValue = Number(out.dealValue);
  if (out.value !== undefined && out.value !== null) out.value = Number(out.value);
  if (out.revenue !== undefined && out.revenue !== null) out.revenue = Number(out.revenue);
  if (out.potentialRevenue !== undefined && out.potentialRevenue !== null) out.potentialRevenue = Number(out.potentialRevenue);
  if (out.score !== undefined && out.score !== null) out.score = Number(out.score);
  if (out.recoveryScore !== undefined && out.recoveryScore !== null) out.recoveryScore = Number(out.recoveryScore);
  if (out.recoveryProbability !== undefined && out.recoveryProbability !== null) out.recoveryProbability = Number(out.recoveryProbability);
  if (out.probability !== undefined && out.probability !== null) out.probability = Number(out.probability);
  if (out.totalRows !== undefined) out.totalRows = Number(out.totalRows);
  if (out.processedRows !== undefined) out.processedRows = Number(out.processedRows);
  if (out.createdCount !== undefined) out.createdCount = Number(out.createdCount);
  if (out.updatedCount !== undefined) out.updatedCount = Number(out.updatedCount);
  if (out.duplicateCount !== undefined) out.duplicateCount = Number(out.duplicateCount);
  if (out.skippedCount !== undefined) out.skippedCount = Number(out.skippedCount);
  if (out.errorCount !== undefined) out.errorCount = Number(out.errorCount);
  // JSON fields
  for (const jf of ["factors", "missingInformation", "targetCriteria", "summary", "metadata"]) {
    if (out[jf] && typeof out[jf] === "string") {
      try { out[jf] = JSON.parse(out[jf]); } catch { /* keep string */ }
    }
  }
  return out;
}

function matchesWhere(row: any, where: any): boolean {
  if (!where) return true;
  if (where.OR && Array.isArray(where.OR)) return where.OR.some((cond: any) => matchesWhere(row, cond));
  if (where.AND && Array.isArray(where.AND)) return where.AND.every((cond: any) => matchesWhere(row, cond));
  for (const [key, condition] of Object.entries(where)) {
    if (key === "OR" || key === "AND") continue;
    if (key === "lead" && typeof condition === "object") continue;
    const value = row[key];
    if (condition === null || condition === undefined) continue;
    if (typeof condition === "object" && !Array.isArray(condition) && !(condition instanceof Date)) {
      const cond = condition as any;
      if (cond.contains !== undefined) {
        const search = String(cond.contains).toLowerCase();
        const fieldVal = String(value || "").toLowerCase();
        if (!fieldVal.includes(search)) return false;
      }
      if (cond.gte !== undefined) { if (value === null || value === undefined) return false; if (Number(value) < Number(cond.gte)) return false; }
      if (cond.lte !== undefined) { if (value === null || value === undefined) return false; if (Number(value) > Number(cond.lte)) return false; }
      if (cond.gt !== undefined) { if (value === null || value === undefined) return false; if (Number(value) <= Number(cond.gt)) return false; }
      if (cond.lt !== undefined) { if (value === null || value === undefined) return false; if (Number(value) >= Number(cond.lt)) return false; }
      if (cond.in !== undefined) { if (!cond.in.includes(value)) return false; }
      if (cond.equals !== undefined) { if (value !== cond.equals) return false; }
    } else {
      if (key === "isDemo") {
        if (Boolean(value) !== Boolean(condition)) return false;
      } else {
        if (value !== condition) { if (String(value) !== String(condition)) return false; }
      }
    }
  }
  return true;
}

function applyOrderBy(rows: any[], orderBy: any): any[] {
  if (!orderBy) return rows;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const order = orders[0];
  if (!order) return rows;
  const [field, direction] = Object.entries(order)[0] as [string, string];
  if (typeof field === "string" && field === "lead" && typeof direction === "object") {
    const nested = direction as any;
    const [nestedField, nestedDir] = Object.entries(nested)[0] as [string, string];
    return rows.sort((a, b) => {
      const av = a.lead?.[nestedField];
      const bv = b.lead?.[nestedField];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (nestedDir === "desc") return av < bv ? 1 : -1;
      return av > bv ? 1 : -1;
    });
  }
  const dir = direction as string;
  return rows.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (av instanceof Date && bv instanceof Date) return dir === "desc" ? bv.getTime() - av.getTime() : av.getTime() - bv.getTime();
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    const as = String(av);
    const bs = String(bv);
    return dir === "desc" ? bs.localeCompare(as) : as.localeCompare(bs);
  });
}

const UserModel = {
  findUnique: async ({ where, include }: any) => {
    let row: any = null;
    if (where.email) row = db.prepare("SELECT * FROM User WHERE email = ?").get(where.email);
    else if (where.id) row = db.prepare("SELECT * FROM User WHERE id = ?").get(where.id);
    if (!row) return null;
    const parsed = parseGenericDates(row);
    if (include?.memberships) {
      const memberships = db.prepare("SELECT * FROM OrganizationMember WHERE userId = ?").all(parsed.id).map((m: any) => parseGenericDates(m));
      if (include.memberships.include?.organization) {
        for (const mem of memberships) {
          const org = db.prepare("SELECT * FROM Organization WHERE id = ?").get(mem.organizationId);
          mem.organization = org ? parseGenericDates(org) : null;
        }
      }
      parsed.memberships = memberships;
    }
    return parsed;
  },
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO User (id, email, passwordHash, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)").run(id, data.email, data.passwordHash, data.name || null, now, now);
    return parseGenericDates(db.prepare("SELECT * FROM User WHERE id = ?").get(id));
  },
};

const OrganizationModel = {
  findUnique: async ({ where }: any) => {
    let row: any = null;
    if (where.id) row = db.prepare("SELECT * FROM Organization WHERE id = ?").get(where.id);
    else if (where.slug) row = db.prepare("SELECT * FROM Organization WHERE slug = ?").get(where.slug);
    return row ? parseGenericDates(row) : null;
  },
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO Organization (id, name, slug, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)").run(id, data.name, data.slug, now, now);
    return parseGenericDates(db.prepare("SELECT * FROM Organization WHERE id = ?").get(id));
  },
};

const OrganizationMemberModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO OrganizationMember (id, userId, organizationId, role, createdAt) VALUES (?, ?, ?, ?, ?)").run(id, data.userId, data.organizationId, data.role || "MEMBER", now);
    return parseGenericDates(db.prepare("SELECT * FROM OrganizationMember WHERE id = ?").get(id));
  },
  findMany: async ({ where, include }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM OrganizationMember WHERE organizationId = ?").all(where.organizationId);
    else if (where?.userId) rows = db.prepare("SELECT * FROM OrganizationMember WHERE userId = ?").all(where.userId);
    else rows = db.prepare("SELECT * FROM OrganizationMember").all();
    let parsed = rows.map((r: any) => parseGenericDates(r));
    if (include?.user) for (const mem of parsed) { const user = db.prepare("SELECT * FROM User WHERE id = ?").get(mem.userId); mem.user = user ? parseGenericDates(user) : null; }
    if (include?.organization) for (const mem of parsed) { const org = db.prepare("SELECT * FROM Organization WHERE id = ?").get(mem.organizationId); mem.organization = org ? parseGenericDates(org) : null; }
    return parsed;
  },
};

const LeadModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare(`INSERT INTO Lead (id, organizationId, name, phone, email, company, manager, product, dealValue, dealStage, status, lastContactAt, source, rawData, lastMessage, isDemo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.organizationId, data.name || null, data.phone || null, data.email || null, data.company || null, data.manager || null, data.product || null, data.dealValue ?? null, data.dealStage || null, data.status || "new", data.lastContactAt ? new Date(data.lastContactAt).toISOString() : null, data.source || null, data.rawData || null, data.lastMessage || null, data.isDemo ? 1 : 0, now, now);
    return parseLeadRow(db.prepare("SELECT * FROM Lead WHERE id = ?").get(id));
  },
  findFirst: async ({ where, include }: any) => {
    let row: any = null;
    if (where?.id && where?.organizationId) row = db.prepare("SELECT * FROM Lead WHERE id = ? AND organizationId = ?").get(where.id, where.organizationId);
    else if (where?.id) row = db.prepare("SELECT * FROM Lead WHERE id = ?").get(where.id);
    else { const all = db.prepare("SELECT * FROM Lead WHERE organizationId = ?").all(where?.organizationId); const filtered = all.map(parseLeadRow).filter((r: any) => matchesWhere(r, where)); row = filtered[0] ? db.prepare("SELECT * FROM Lead WHERE id = ?").get(filtered[0].id) : null; }
    if (!row) return null;
    let parsed = parseLeadRow(row);
    if (include) {
      if (include.aiAnalyses) { let analyses = db.prepare("SELECT * FROM AIAnalysis WHERE leadId = ? ORDER BY createdAt DESC").all(parsed.id).map(parseAnalysisRow); if (include.aiAnalyses.take) analyses = analyses.slice(0, include.aiAnalyses.take); parsed.aiAnalyses = analyses; }
      if (include.recoveryEvents) parsed.recoveryEvents = db.prepare("SELECT * FROM RecoveryEvent WHERE leadId = ? ORDER BY createdAt DESC").all(parsed.id).map(parseGenericDates);
      if (include.campaignLeads) { let cls = db.prepare("SELECT * FROM CampaignLead WHERE leadId = ?").all(parsed.id).map(parseGenericDates); if (include.campaignLeads.include?.campaign) for (const cl of cls) { const camp = db.prepare("SELECT * FROM Campaign WHERE id = ?").get(cl.campaignId); cl.campaign = camp ? parseGenericDates(camp) : null; } parsed.campaignLeads = cls; }
      if (include.recoveryOpportunities) parsed.recoveryOpportunities = db.prepare("SELECT * FROM RecoveryOpportunity WHERE leadId = ? ORDER BY createdAt DESC").all(parsed.id).map(parseGenericDates);
    }
    return parsed;
  },
  findMany: async ({ where, take, skip, orderBy, include, select }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM Lead WHERE organizationId = ?").all(where.organizationId).map(parseLeadRow);
    else rows = db.prepare("SELECT * FROM Lead").all().map(parseLeadRow);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (where?.id?.in) { const ids = new Set(where.id.in); rows = rows.filter((r: any) => ids.has(r.id)); }
    if (include?.aiAnalyses) for (const lead of rows) lead.aiAnalyses = db.prepare("SELECT * FROM AIAnalysis WHERE leadId = ? ORDER BY createdAt DESC").all(lead.id).map(parseAnalysisRow);
    if (include?.recoveryOpportunities) for (const lead of rows) lead.recoveryOpportunities = db.prepare("SELECT * FROM RecoveryOpportunity WHERE leadId = ? ORDER BY createdAt DESC").all(lead.id).map(parseGenericDates);
    if (orderBy) rows = applyOrderBy(rows, orderBy);
    if (skip) rows = rows.slice(skip);
    if (take) rows = rows.slice(0, take);
    if (select) rows = rows.map((r: any) => { const out: any = {}; for (const key of Object.keys(select)) if (select[key]) out[key] = r[key]; return out; });
    return rows;
  },
  count: async ({ where }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM Lead WHERE organizationId = ?").all(where.organizationId).map(parseLeadRow);
    else rows = db.prepare("SELECT * FROM Lead").all().map(parseLeadRow);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (where?.id?.in) { const ids = new Set(where.id.in); rows = rows.filter((r: any) => ids.has(r.id)); }
    return rows.length;
  },
  deleteMany: async ({ where }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM Lead WHERE organizationId = ?").all(where.organizationId).map(parseLeadRow);
    else rows = db.prepare("SELECT * FROM Lead").all().map(parseLeadRow);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    const delStmt = db.prepare("DELETE FROM Lead WHERE id = ?");
    for (const r of rows) delStmt.run(r.id);
    return { count: rows.length };
  },
  update: async ({ where, data }: any) => {
    const existing = db.prepare("SELECT * FROM Lead WHERE id = ?").get(where.id);
    if (!existing) throw new Error("Lead not found");
    const fields: string[] = []; const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === "lastContactAt" && v) { fields.push(`${k} = ?`); values.push(new Date(v as any).toISOString()); }
      else { fields.push(`${k} = ?`); values.push(v); }
    }
    fields.push("updatedAt = ?"); values.push(nowISO()); values.push(where.id);
    db.prepare(`UPDATE Lead SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return parseLeadRow(db.prepare("SELECT * FROM Lead WHERE id = ?").get(where.id));
  },
  groupBy: async ({ by, where }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM Lead WHERE organizationId = ?").all(where.organizationId).map(parseLeadRow);
    else rows = db.prepare("SELECT * FROM Lead").all().map(parseLeadRow);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    const groups: Record<string, any> = {};
    for (const r of rows) { const key = String((r as any)[by[0]]); if (!groups[key]) groups[key] = { [by[0]]: (r as any)[by[0]], _count: 0 }; groups[key]._count++; }
    return Object.values(groups).map((g: any) => ({ isDemo: g.isDemo === true || g.isDemo === "true" || g.isDemo === 1 ? true : g.isDemo === false || g.isDemo === "false" || g.isDemo === 0 ? false : g.isDemo, _count: g._count }));
  },
};

const AIAnalysisModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare(`INSERT INTO AIAnalysis (id, organizationId, leadId, leadStatus, buyingIntent, lossReason, recoveryScore, recoveryProbability, confidence, recommendedAction, reasoningSummary, recommendedMessageGoal, generatedMessage, modelVersion, factors, missingInformation, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.organizationId, data.leadId, data.leadStatus, data.buyingIntent, data.lossReason, data.recoveryScore, data.recoveryProbability ?? null, data.confidence, data.recommendedAction, data.reasoningSummary, data.recommendedMessageGoal || null, data.generatedMessage || null, data.modelVersion || "v1", data.factors ? JSON.stringify(data.factors) : null, data.missingInformation ? JSON.stringify(data.missingInformation) : null, now);
    return parseAnalysisRow(db.prepare("SELECT * FROM AIAnalysis WHERE id = ?").get(id));
  },
  findMany: async ({ where, include, orderBy, skip, take }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM AIAnalysis WHERE organizationId = ?").all(where.organizationId).map(parseAnalysisRow);
    else rows = db.prepare("SELECT * FROM AIAnalysis").all().map(parseAnalysisRow);
    rows = rows.filter((r: any) => {
      if (!matchesWhere(r, where)) return false;
      if (where?.lead) {
        const lead = db.prepare("SELECT * FROM Lead WHERE id = ?").get(r.leadId);
        if (!lead) return false;
        if (!matchesWhere(parseLeadRow(lead), where.lead)) return false;
      }
      return true;
    });
    if (include?.lead) for (const a of rows) { const leadRow = db.prepare("SELECT * FROM Lead WHERE id = ?").get(a.leadId); a.lead = leadRow ? parseLeadRow(leadRow) : null; }
    if (orderBy) rows = applyOrderBy(rows, orderBy);
    if (skip) rows = rows.slice(skip);
    if (take) rows = rows.slice(0, take);
    return rows;
  },
  count: async ({ where }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM AIAnalysis WHERE organizationId = ?").all(where.organizationId).map(parseAnalysisRow);
    else rows = db.prepare("SELECT * FROM AIAnalysis").all().map(parseAnalysisRow);
    rows = rows.filter((r: any) => {
      if (!matchesWhere(r, where)) return false;
      if (where?.lead) {
        const lead = db.prepare("SELECT * FROM Lead WHERE id = ?").get(r.leadId);
        if (!lead) return false;
        if (!matchesWhere(parseLeadRow(lead), where.lead)) return false;
      }
      return true;
    });
    return rows.length;
  },
  update: async ({ where, data }: any) => {
    const existing = db.prepare("SELECT * FROM AIAnalysis WHERE id = ?").get(where.id);
    if (!existing) throw new Error("Analysis not found");
    const fields: string[] = []; const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === "factors" || k === "missingInformation") { fields.push(`${k} = ?`); values.push(v ? JSON.stringify(v) : null); }
      else { fields.push(`${k} = ?`); values.push(v); }
    }
    values.push(where.id);
    db.prepare(`UPDATE AIAnalysis SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return parseAnalysisRow(db.prepare("SELECT * FROM AIAnalysis WHERE id = ?").get(where.id));
  },
};

const RecoveryOpportunityModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare(`INSERT INTO RecoveryOpportunity (id, organizationId, leadId, dealId, score, category, probability, confidence, potentialRevenue, status, factors, reasoningSummary, recommendedAction, lastContactAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.organizationId, data.leadId, data.dealId || null, data.score, data.category, data.probability ?? null, data.confidence, data.potentialRevenue ?? null, data.status || "open", data.factors ? JSON.stringify(data.factors) : null, data.reasoningSummary || null, data.recommendedAction || null, data.lastContactAt ? new Date(data.lastContactAt).toISOString() : null, now, now);
    return parseGenericDates(db.prepare("SELECT * FROM RecoveryOpportunity WHERE id = ?").get(id));
  },
  findMany: async ({ where, include, orderBy, skip, take }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM RecoveryOpportunity WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM RecoveryOpportunity").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (include?.lead) for (const opp of rows) { const leadRow = db.prepare("SELECT * FROM Lead WHERE id = ?").get(opp.leadId); opp.lead = leadRow ? parseLeadRow(leadRow) : null; }
    if (orderBy) rows = applyOrderBy(rows, orderBy);
    if (skip) rows = rows.slice(skip);
    if (take) rows = rows.slice(0, take);
    return rows;
  },
  count: async ({ where }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM RecoveryOpportunity WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM RecoveryOpportunity").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    return rows.length;
  },
  findFirst: async ({ where }: any) => {
    let row: any = null;
    if (where?.id && where?.organizationId) row = db.prepare("SELECT * FROM RecoveryOpportunity WHERE id = ? AND organizationId = ?").get(where.id, where.organizationId);
    else if (where?.id) row = db.prepare("SELECT * FROM RecoveryOpportunity WHERE id = ?").get(where.id);
    return row ? parseGenericDates(row) : null;
  },
  update: async ({ where, data }: any) => {
    const fields: string[] = []; const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === "factors") { fields.push(`${k} = ?`); values.push(v ? JSON.stringify(v) : null); }
      else { fields.push(`${k} = ?`); values.push(v); }
    }
    fields.push("updatedAt = ?"); values.push(nowISO()); values.push(where.id);
    db.prepare(`UPDATE RecoveryOpportunity SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return parseGenericDates(db.prepare("SELECT * FROM RecoveryOpportunity WHERE id = ?").get(where.id));
  },
};

const CampaignModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO Campaign (id, organizationId, name, description, status, targetCriteria, createdById, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, data.organizationId, data.name, data.description || null, data.status || "draft", data.targetCriteria ? JSON.stringify(data.targetCriteria) : null, data.createdById || null, now, now);
    return parseGenericDates(db.prepare("SELECT * FROM Campaign WHERE id = ?").get(id));
  },
  findMany: async ({ where, include, orderBy }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM Campaign WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM Campaign").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (orderBy) rows = applyOrderBy(rows, orderBy);
    if (include?._count?.select?.campaignLeads) for (const c of rows) { const count = db.prepare("SELECT COUNT(*) as cnt FROM CampaignLead WHERE campaignId = ?").get(c.id) as any; c._count = { campaignLeads: count.cnt }; }
    return rows;
  },
  findFirst: async ({ where, include }: any) => {
    let row: any = null;
    if (where?.id && where?.organizationId) row = db.prepare("SELECT * FROM Campaign WHERE id = ? AND organizationId = ?").get(where.id, where.organizationId);
    else if (where?.id) row = db.prepare("SELECT * FROM Campaign WHERE id = ?").get(where.id);
    else { const all = db.prepare("SELECT * FROM Campaign WHERE organizationId = ?").all(where?.organizationId).map(parseGenericDates); const filtered = all.filter((r: any) => matchesWhere(r, where)); row = filtered[0] ? db.prepare("SELECT * FROM Campaign WHERE id = ?").get(filtered[0].id) : null; }
    if (!row) return null;
    let parsed = parseGenericDates(row);
    if (include?.campaignLeads) {
      let cls = db.prepare("SELECT * FROM CampaignLead WHERE campaignId = ?").all(parsed.id).map(parseGenericDates);
      if (include.campaignLeads.include?.lead) for (const cl of cls) { const leadRow = db.prepare("SELECT * FROM Lead WHERE id = ?").get(cl.leadId); let lead = leadRow ? parseLeadRow(leadRow) : null; if (lead && include.campaignLeads.include.lead.include?.aiAnalyses) lead.aiAnalyses = db.prepare("SELECT * FROM AIAnalysis WHERE leadId = ? ORDER BY createdAt DESC").all(lead.id).map(parseAnalysisRow); cl.lead = lead; }
      parsed.campaignLeads = cls;
    }
    return parsed;
  },
  update: async ({ where, data }: any) => {
    const fields: string[] = []; const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === "targetCriteria") { fields.push(`${k} = ?`); values.push(v ? JSON.stringify(v) : null); }
      else { fields.push(`${k} = ?`); values.push(v); }
    }
    fields.push("updatedAt = ?"); values.push(nowISO()); values.push(where.id);
    db.prepare(`UPDATE Campaign SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return parseGenericDates(db.prepare("SELECT * FROM Campaign WHERE id = ?").get(where.id));
  },
};

const CampaignLeadModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare(`INSERT INTO CampaignLead (id, organizationId, campaignId, leadId, status, messageGenerated, messageEdited, messageStatus, contactedAt, response, outcome, revenue, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.organizationId, data.campaignId, data.leadId, data.status || "selected", data.messageGenerated || null, data.messageEdited || null, data.messageStatus || "pending", data.contactedAt ? new Date(data.contactedAt).toISOString() : null, data.response || null, data.outcome || null, data.revenue ?? null, now, now);
    return parseGenericDates(db.prepare("SELECT * FROM CampaignLead WHERE id = ?").get(id));
  },
  findMany: async ({ where }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM CampaignLead WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else if (where?.campaignId) rows = db.prepare("SELECT * FROM CampaignLead WHERE campaignId = ?").all(where.campaignId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM CampaignLead").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    return rows;
  },
  aggregate: async ({ where, _sum }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM CampaignLead WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM CampaignLead").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (_sum?.revenue) return { _sum: { revenue: rows.reduce((s, r) => s + (r.revenue || 0), 0) } };
    return { _sum: {} };
  },
  update: async ({ where, data }: any) => {
    const fields: string[] = []; const values: any[] = [];
    for (const [k, v] of Object.entries(data)) { fields.push(`${k} = ?`); values.push(v); }
    fields.push("updatedAt = ?"); values.push(nowISO()); values.push(where.id);
    db.prepare(`UPDATE CampaignLead SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return parseGenericDates(db.prepare("SELECT * FROM CampaignLead WHERE id = ?").get(where.id));
  },
};

const RecoveryEventModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO RecoveryEvent (id, organizationId, leadId, opportunityId, campaignId, userId, type, outcome, revenue, recoveredAt, source, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, data.organizationId, data.leadId, data.opportunityId || null, data.campaignId || null, data.userId || null, data.type || null, data.outcome, data.revenue ?? null, data.recoveredAt ? new Date(data.recoveredAt).toISOString() : null, data.source || null, data.note || null, now);
    return parseGenericDates(db.prepare("SELECT * FROM RecoveryEvent WHERE id = ?").get(id));
  },
  findMany: async ({ where, orderBy }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM RecoveryEvent WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM RecoveryEvent").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (orderBy) rows = applyOrderBy(rows, orderBy);
    return rows;
  },
};

const ImportJobModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO ImportJob (id, organizationId, fileName, status, totalRows, processedRows, createdCount, updatedCount, duplicateCount, skippedCount, errorCount, errors, mapping, summary, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, data.organizationId, data.fileName, data.status || "pending", data.totalRows || 0, data.processedRows || 0, data.createdCount || 0, data.updatedCount || 0, data.duplicateCount || 0, data.skippedCount || 0, data.errorCount || 0, data.errors || null, data.mapping || null, data.summary ? JSON.stringify(data.summary) : null, now, now);
    return parseGenericDates(db.prepare("SELECT * FROM ImportJob WHERE id = ?").get(id));
  },
  update: async ({ where, data }: any) => {
    const existing = db.prepare("SELECT * FROM ImportJob WHERE id = ?").get(where.id);
    if (!existing) throw new Error("ImportJob not found");
    const fields: string[] = []; const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === "summary" || k === "mapping") { fields.push(`${k} = ?`); values.push(typeof v === "object" ? JSON.stringify(v) : v); }
      else { fields.push(`${k} = ?`); values.push(typeof v === "object" ? JSON.stringify(v) : v); }
    }
    fields.push("updatedAt = ?"); values.push(nowISO()); values.push(where.id);
    db.prepare(`UPDATE ImportJob SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return parseGenericDates(db.prepare("SELECT * FROM ImportJob WHERE id = ?").get(where.id));
  },
  findMany: async ({ where, orderBy }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM ImportJob WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM ImportJob").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (orderBy) rows = applyOrderBy(rows, orderBy);
    return rows;
  },
};

const AuditLogModel = {
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO AuditLog (id, organizationId, userId, event, entityType, entityId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, data.organizationId, data.userId || null, data.event, data.entityType || null, data.entityId || null, data.metadata ? JSON.stringify(data.metadata) : null, now);
    return parseGenericDates(db.prepare("SELECT * FROM AuditLog WHERE id = ?").get(id));
  },
  findMany: async ({ where, orderBy, take }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM AuditLog WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM AuditLog").all().map(parseGenericDates);
    rows = rows.filter((r: any) => matchesWhere(r, where));
    if (orderBy) rows = applyOrderBy(rows, orderBy);
    if (take) rows = rows.slice(0, take);
    return rows;
  },
};

const ConversationModel = { findMany: async () => [], create: async ({ data }: any) => ({ id: cuid(), ...data }), };
const MessageModel = { findMany: async () => [], create: async ({ data }: any) => ({ id: cuid(), ...data }), };
const DealModel = {
  findMany: async ({ where }: any) => {
    let rows: any[] = [];
    if (where?.organizationId) rows = db.prepare("SELECT * FROM Deal WHERE organizationId = ?").all(where.organizationId).map(parseGenericDates);
    else rows = db.prepare("SELECT * FROM Deal").all().map(parseGenericDates);
    return rows.filter((r: any) => matchesWhere(r, where));
  },
  create: async ({ data }: any) => {
    const id = data.id || cuid();
    const now = nowISO();
    db.prepare("INSERT INTO Deal (id, organizationId, leadId, title, value, stage, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, data.organizationId, data.leadId || null, data.title || null, data.value ?? null, data.stage || null, data.status || null, now, now);
    return parseGenericDates(db.prepare("SELECT * FROM Deal WHERE id = ?").get(id));
  },
};

export const prismaFallback = {
  user: UserModel,
  organization: OrganizationModel,
  organizationMember: OrganizationMemberModel,
  lead: LeadModel,
  conversation: ConversationModel,
  message: MessageModel,
  deal: DealModel,
  aIAnalysis: AIAnalysisModel,
  recoveryOpportunity: RecoveryOpportunityModel,
  campaign: CampaignModel,
  campaignLead: CampaignLeadModel,
  recoveryEvent: RecoveryEventModel,
  importJob: ImportJobModel,
  auditLog: AuditLogModel,
};

export default prismaFallback;
