#!/usr/bin/env node
/**
 * Generates api/scripts/seed_demo.sql
 * Run: node scripts/generate-demo-sql.mjs
 */

import { writeFileSync } from 'fs';

const DEMO_EMAIL = 'demo@user.com';
const DEMO_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // password
const DEMO_COMPANY = 'Demo_Company';
const USER_ID = 'd0000001-0001-4001-8001-000000000001';
const COMPANY_ID = 'd0000001-0001-4001-8001-000000000002';

function demoId(series, n) {
  return `d000000${series}-0001-4001-8001-${String(n).padStart(12, '0')}`;
}

function sqlStr(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function loanDaysBetween(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(0, Math.floor((b - a) / 86400000));
}

function accrueInterest(balance, rate, period, days) {
  if (balance <= 0 || rate <= 0 || days <= 0) return 0;
  if (period === 'month') return balance * (rate / 100) * (days / 30);
  return balance * (rate / 100) * (days / 365);
}

function calculateLoanBalances(loan, repayments, asOf = '2026-06-01') {
  let balance = loan.principal;
  let accruedInterest = 0;
  let totalRepaid = 0;
  let lastDate = loan.loan_date;
  const sorted = [...repayments].sort((a, b) => a.repayment_date.localeCompare(b.repayment_date));

  for (const rep of sorted) {
    if (rep.repayment_date > asOf) break;
    const days = loanDaysBetween(lastDate, rep.repayment_date);
    accruedInterest += accrueInterest(balance, loan.interest_rate, loan.interest_period, days);
    totalRepaid += rep.amount;
    const payInterest = Math.min(rep.amount, accruedInterest);
    accruedInterest -= payInterest;
    balance = Math.max(0, balance - (rep.amount - payInterest));
    lastDate = rep.repayment_date;
  }
  if (lastDate < asOf) {
    accruedInterest += accrueInterest(balance, loan.interest_rate, loan.interest_period, loanDaysBetween(lastDate, asOf));
  }
  return { pending: Math.round((balance + accruedInterest) * 100) / 100 };
}

const clients = [
  ['Rajesh Kumar', '9876543210', 'Hyderabad', 'Referral'],
  ['Priya Sharma', '9848012345', 'Secunderabad', 'Walk-in'],
  ['Anil Reddy', '9123456780', 'Gachibowli', 'Google'],
  ['Sneha Patel', '9988776655', 'Kondapur', 'Referral'],
  ['Vikram Singh', '9010203040', 'Madhapur', 'Site board'],
  ['Lakshmi Devi', '8899776655', 'Banjara Hills', 'Referral'],
  ['Mohammed Farhan', '9701234567', 'Tolichowki', 'Walk-in'],
  ['Kavitha Nair', '9345678901', 'Uppal', 'Google'],
  ['Suresh Babu', '9123409876', 'LB Nagar', 'Referral'],
  ['Deepa Iyer', '9000011122', 'Hitech City', 'Instagram'],
  ['Ramesh Gupta', '9887766554', 'Kukatpally', 'Referral'],
  ['Meena Rao', '9554433221', 'Jubilee Hills', 'Walk-in'],
];

const titles = [
  'Kitchen renovation', 'Bathroom remodel', 'Full home painting', 'Tile flooring',
  'Roof waterproofing', 'Boundary wall', 'Office interior', 'Shop renovation',
  'Modular kitchen', 'False ceiling', 'Plumbing overhaul', 'Electrical rewiring',
  'Terrace garden setup', 'Car parking shed', 'Staircase railing', 'Gate fabrication',
  'Water tank platform', 'Compound levelling', 'Room extension', 'Balcony enclosure',
  'Granite flooring', 'POP ceiling work', 'Septic tank repair', 'Driveway paving',
  'Warehouse flooring', 'Clinic interior', 'Restaurant fit-out', 'Flat renovation',
  'Villa landscaping', 'AC ducting & ceiling', 'Main door replacement', 'Window grills',
  'Solar panel mounting', 'Drainage line', 'Lift lobby upgrade', 'Pooja room work',
  'Kids room interior', 'Guest house build', 'Civil repair package', 'Monsoon leakage fix',
  'Column strengthening', 'Mezzanine floor',
];

const quotedAmounts = [
  45000, 78500, 120000, 185000, 95000, 320000, 560000, 890000, 1250000, 450000,
  67000, 142000, 98000, 210000, 375000, 520000, 780000, 1100000, 1650000, 2000000,
  55000, 88000, 135000, 240000, 410000, 620000, 980000, 30000, 76000, 198000,
  305000, 480000, 720000, 1050000, 89000, 156000, 275000, 390000, 510000, 840000,
  1190000, 1750000,
];

const projectYears = [
  ...Array(11).fill(2026),
  ...Array(30).fill(2025),
];

const projectDates2026 = [
  ['2026-01-12', '2026-03-05'], ['2026-01-28', '2026-04-10'], ['2026-02-14', '2026-05-01'],
  ['2026-02-20', '2026-04-18'], ['2026-03-08', '2026-05-22'], ['2026-03-15', '2026-06-01'],
  ['2026-04-02', '2026-05-30'], ['2026-04-18', '2026-06-10'], ['2026-05-01', '2026-06-15'],
  ['2026-05-10', '2026-06-18'], ['2026-05-20', '2026-06-20'],
];

const projectDates2025 = [
  ['2025-01-05', '2025-03-20'], ['2025-01-18', '2025-04-02'], ['2025-02-01', '2025-04-15'],
  ['2025-02-14', '2025-05-01'], ['2025-03-01', '2025-05-18'], ['2025-03-12', '2025-06-02'],
  ['2025-03-25', '2025-06-15'], ['2025-04-05', '2025-06-28'], ['2025-04-18', '2025-07-10'],
  ['2025-05-01', '2025-07-22'], ['2025-05-14', '2025-08-05'], ['2025-05-28', '2025-08-18'],
  ['2025-06-10', '2025-09-01'], ['2025-06-22', '2025-09-12'], ['2025-07-05', '2025-09-25'],
  ['2025-07-18', '2025-10-08'], ['2025-08-01', '2025-10-20'], ['2025-08-14', '2025-11-02'],
  ['2025-08-28', '2025-11-15'], ['2025-09-10', '2025-11-28'], ['2025-09-22', '2025-12-10'],
  ['2025-10-05', '2025-12-18'], ['2025-10-18', '2025-12-22'], ['2025-11-01', '2025-12-28'],
  ['2025-11-12', '2025-12-30'], ['2025-01-25', '2025-04-08'], ['2025-02-08', '2025-04-22'],
  ['2025-03-18', '2025-06-08'], ['2025-04-28', '2025-07-15'], ['2025-06-01', '2025-08-25'],
];

const lenders = [
  ['Raghavendra Uncle', '9849001122', 'Tarnaka, Hyderabad'],
  ['Srinivas Garu', '9010109090', 'Dilsukhnagar, Hyderabad'],
  ['Family Friend — Kiran', '9988007766', 'Malkajgiri, Hyderabad'],
  ['Local Financier — Babu', '9700112233', 'Abids, Hyderabad'],
  ['Partner — Naresh', '9123123123', 'Ameerpet, Hyderabad'],
  ['Material Supplier Credit', '8899665544', 'Balanagar, Hyderabad'],
];

const loanPlans = [
  { principal: 250000, date: '2024-03-15', rate: 12.0, period: 'year', repay: 'full' },
  { principal: 180000, date: '2024-06-01', rate: 1.5, period: 'month', repay: 'full' },
  { principal: 500000, date: '2024-09-10', rate: 18.0, period: 'year', repay: 'full' },
  { principal: 120000, date: '2025-01-20', rate: 0.0, period: 'year', repay: 'full' },
  { principal: 95000, date: '2025-04-05', rate: 0.0, period: 'year', repay: 'full' },
  { principal: 320000, date: '2025-06-12', rate: 12.0, period: 'year', repay: 'partial', fraction: 0.55 },
  { principal: 410000, date: '2025-08-18', rate: 15.0, period: 'year', repay: 'partial', fraction: 0.32 },
  { principal: 150000, date: '2025-10-01', rate: 0.0, period: 'year', repay: 'partial', fraction: 0.68 },
  { principal: 600000, date: '2025-11-15', rate: 12.0, period: 'year', repay: 'none' },
  { principal: 275000, date: '2026-02-01', rate: 0.0, period: 'year', repay: 'none' },
];

const lines = [];
lines.push('-- Skyline demo tenant seed');
lines.push('-- Login: demo@user.com');
lines.push('-- Password: password');
lines.push('-- Company: Demo_Company');
lines.push('-- Run in phpMyAdmin against your Skyline database.');
lines.push('-- Requires migrations 001-004 (incl. loans tables).');
lines.push('');
lines.push('SET NAMES utf8mb4;');
lines.push('');
lines.push(`DELETE FROM users WHERE email = ${sqlStr(DEMO_EMAIL)};`);
lines.push('');

// User + company + profile
lines.push(`INSERT INTO users (id, email, password_hash) VALUES (${sqlStr(USER_ID)}, ${sqlStr(DEMO_EMAIL)}, ${sqlStr(DEMO_PASSWORD_HASH)});`);
lines.push(`INSERT INTO companies (id, name, owner_id) VALUES (${sqlStr(COMPANY_ID)}, ${sqlStr(DEMO_COMPANY)}, ${sqlStr(USER_ID)});`);
lines.push(`INSERT INTO profiles (id, company_id, role, is_active, full_name, email) VALUES (${sqlStr(USER_ID)}, ${sqlStr(COMPANY_ID)}, 'owner', 1, 'Demo Owner', ${sqlStr(DEMO_EMAIL)});`);
lines.push('');

// Clients
lines.push('-- Clients (12)');
clients.forEach((c, i) => {
  const clientRowId = demoId('2', i + 1);
  const email = c[0].toLowerCase().replace(/ /g, '.') + '@example.com';
  lines.push(`INSERT INTO clients (id, company_id, client_type, name, email, phone, location, source, tags) VALUES (${sqlStr(clientRowId)}, ${sqlStr(COMPANY_ID)}, 'b2c', ${sqlStr(c[0])}, ${sqlStr(email)}, ${sqlStr(c[1])}, ${sqlStr(c[2])}, ${sqlStr(c[3])}, '["residential","demo"]');`);
});
lines.push('');

// Projects
lines.push('-- Projects (11 in 2026, 30 in 2025 — all completed)');
let dateIdx2025 = 0;
let dateIdx2026 = 0;
const projects = [];
projectYears.forEach((year, i) => {
  const client = clients[i % clients.length];
  const clientId = demoId('2', (i % 12) + 1);
  const projectId = demoId('3', i + 1);
  const title = `${titles[i % titles.length]} — ${client[2]}`;
  const quoted = quotedAmounts[i];
  const [start, end] = year === 2026
    ? projectDates2026[dateIdx2026++]
    : projectDates2025[dateIdx2025++];
  projects.push({ id: projectId, quoted, start, end, client: client[0], location: client[2] });
  lines.push(`INSERT INTO projects (id, company_id, client_id, project_title, client_name, location, work_description, total_quoted_amount, status, completion_percent, start_date, end_date) VALUES (${sqlStr(projectId)}, ${sqlStr(COMPANY_ID)}, ${sqlStr(clientId)}, ${sqlStr(title)}, ${sqlStr(client[0])}, ${sqlStr(client[2])}, ${sqlStr(`Demo project for ${client[0]}. Civil, finishing, and handover.`)}, ${quoted}, 'completed', 100, ${sqlStr(start)}, ${sqlStr(end)});`);
});
lines.push('');

// Payments & expenses
lines.push('-- Payments and expenses');
let paySeq = 1;
let expSeq = 1;
const expenseTypes = ['material', 'labour', 'transportation', 'other'];
const expenseDesc = {
  material: ['Cement & sand', 'Tiles purchase', 'Steel rods', 'Paint drums'],
  labour: ['Mason team', 'Helper wages', 'Electrician labour', 'Painter labour'],
  transportation: ['Material transport', 'Truck hire', 'Delivery charges'],
  other: ['Permit fee', 'Tool rental', 'Scaffolding'],
};

projects.forEach((p, pi) => {
  const received = Math.round(p.quoted * (0.92 + (pi % 9) * 0.01) * 100) / 100;
  const p1 = Math.round(received * 0.35 * 100) / 100;
  const p2 = Math.round(received * 0.35 * 100) / 100;
  const p3 = Math.round((received - p1 - p2) * 100) / 100;
  const payments = [
    { amount: p1, date: addDays(p.start, 7), method: 'cash', comment: 'Advance' },
    { amount: p2, date: addDays(p.start, 45), method: 'online_transfer', comment: 'Milestone payment' },
    { amount: p3, date: addDays(p.end, -5), method: pi % 2 ? 'cheque' : 'online_transfer', comment: 'Final settlement' },
  ];
  payments.forEach((pay) => {
    const payId = demoId('4', paySeq++);
    lines.push(`INSERT INTO payments (id, company_id, project_id, payment_method, amount, payment_date, comments) VALUES (${sqlStr(payId)}, ${sqlStr(COMPANY_ID)}, ${sqlStr(p.id)}, ${sqlStr(pay.method)}, ${pay.amount}, ${sqlStr(pay.date)}, ${sqlStr(pay.comment)});`);
  });

  const expenseTarget = Math.round(received * (0.55 + (pi % 5) * 0.04) * 100) / 100;
  let spent = 0;
  let ei = 0;
  while (spent < expenseTarget && ei < 6) {
    const type = expenseTypes[ei % 4];
    const chunk = Math.min(
      Math.round((1500 + (pi * 137 + ei * 911) % 45000) * 100) / 100,
      Math.round((expenseTarget - spent) * 100) / 100,
    );
    if (chunk <= 0) break;
    spent += chunk;
    const expId = demoId('5', expSeq++);
    const desc = expenseDesc[type][ei % expenseDesc[type].length];
    lines.push(`INSERT INTO expenses (id, company_id, project_id, expense_type, amount, description, expense_date) VALUES (${sqlStr(expId)}, ${sqlStr(COMPANY_ID)}, ${sqlStr(p.id)}, ${sqlStr(type)}, ${chunk}, ${sqlStr(desc)}, ${sqlStr(addDays(p.start, 10 + ei * 12))});`);
    ei++;
  }
});
lines.push('');

// Lenders
lines.push('-- Lenders (6)');
const lenderIds = [];
lenders.forEach((l, i) => {
  const lenderRowId = demoId('6', i + 1);
  lenderIds.push(lenderRowId);
  lines.push(`INSERT INTO lenders (id, company_id, name, phone, address, notes) VALUES (${sqlStr(lenderRowId)}, ${sqlStr(COMPANY_ID)}, ${sqlStr(l[0])}, ${sqlStr(l[1])}, ${sqlStr(l[2])}, 'Demo lender contact');`);
});
lines.push('');

// Loans + repayments
lines.push('-- Loans (10: 5 fully repaid, 3 partial, 2 open)');
let repSeq = 1;
loanPlans.forEach((plan, i) => {
  const loanId = demoId('7', i + 1);
  const lenderId = lenderIds[i % lenderIds.length];
  lines.push(`INSERT INTO loans (id, company_id, lender_id, principal_amount, loan_date, interest_rate, interest_period, notes) VALUES (${sqlStr(loanId)}, ${sqlStr(COMPANY_ID)}, ${sqlStr(lenderId)}, ${plan.principal}, ${sqlStr(plan.date)}, ${plan.rate}, ${sqlStr(plan.period)}, ${sqlStr(`Demo loan #${i + 1}`)});`);

  if (plan.repay === 'full') {
    const loan = { principal: plan.principal, loan_date: plan.date, interest_rate: plan.rate, interest_period: plan.period };
    const { pending } = calculateLoanBalances(loan, [], '2026-05-01');
    const amount = plan.rate === 0 ? plan.principal : pending;
    const repId = demoId('8', repSeq++);
    lines.push(`INSERT INTO loan_repayments (id, company_id, loan_id, amount, repayment_date, payment_method, comments) VALUES (${sqlStr(repId)}, ${sqlStr(COMPANY_ID)}, ${sqlStr(loanId)}, ${amount}, '2026-05-10', 'online_transfer', 'Final closure');`);
  } else if (plan.repay === 'partial') {
    const a = Math.round(plan.principal * plan.fraction * 0.45 * 100) / 100;
    const b = Math.round(plan.principal * plan.fraction * 0.55 * 100) / 100;
    lines.push(`INSERT INTO loan_repayments (id, company_id, loan_id, amount, repayment_date, payment_method, comments) VALUES (${sqlStr(demoId('8', repSeq++))}, ${sqlStr(COMPANY_ID)}, ${sqlStr(loanId)}, ${a}, ${sqlStr(addDays(plan.date, 45))}, 'cash', 'Part payment');`);
    lines.push(`INSERT INTO loan_repayments (id, company_id, loan_id, amount, repayment_date, payment_method, comments) VALUES (${sqlStr(demoId('8', repSeq++))}, ${sqlStr(COMPANY_ID)}, ${sqlStr(loanId)}, ${b}, ${sqlStr(addDays(plan.date, 120))}, 'online_transfer', 'Part payment');`);
  }
});

const outPath = new URL('../api/scripts/seed_demo.sql', import.meta.url);
writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`Wrote ${lines.length} lines to api/scripts/seed_demo.sql`);
