<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

const PERSONAL_COMPANY_NAME = 'Freelancer / Self employed';

// GET /profile -> profile row with nested { companies: { name } } or null.
// POST /profile/skip -> personal workspace (Freelancer / Self employed).
function route_profile(string $method, array $segments): void
{
    $action = $segments[0] ?? null;

    if ($method === 'GET' && $action === null) {
        profile_get();
    }
    if ($method === 'POST' && $action === 'skip') {
        profile_skip();
    }
    json_error('Not found', 404);
}

function profile_get(): void
{
    $user = require_user();
    $stmt = db()->prepare(
        'SELECT p.*, c.name AS company_name
         FROM profiles p
         LEFT JOIN companies c ON c.id = p.company_id
         WHERE p.id = ? LIMIT 1'
    );
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    if (!$row) {
        json_response(null);
    }

    // Existing users who skipped before personal workspaces were added.
    if (!$row['company_id'] && $row['role'] !== 'super_admin') {
        create_personal_company_for_user($user);
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();
    }

    $companies = $row['company_name'] !== null ? ['name' => $row['company_name']] : null;
    unset($row['company_name']);
    $row['is_active'] = (bool) $row['is_active'];
    $row['companies'] = $companies;
    json_response($row);
}

// POST /profile/skip -> create a personal owner workspace.
function profile_skip(): void
{
    $user = require_user();
    $pdo = db();

    $existing = $pdo->prepare('SELECT company_id FROM profiles WHERE id = ? LIMIT 1');
    $existing->execute([$user['id']]);
    $current = $existing->fetch();
    if ($current && $current['company_id'] && !is_personal_company_id($current['company_id'])) {
        json_error('User already belongs to a company', 409);
    }
    if ($current && $current['company_id'] && is_personal_company_id($current['company_id'])) {
        json_response(['ok' => true]);
    }

    create_personal_company_for_user($user);
    json_response(['ok' => true]);
}

function is_personal_company_id(?string $companyId): bool
{
    if (!$companyId) {
        return false;
    }
    $stmt = db()->prepare('SELECT name FROM companies WHERE id = ? LIMIT 1');
    $stmt->execute([$companyId]);
    $row = $stmt->fetch();
    return $row && $row['name'] === PERSONAL_COMPANY_NAME;
}

function create_personal_company_for_user(array $user, ?string $fullName = null): string
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $companyId = uuid4();
        $pdo->prepare('INSERT INTO companies (id, name, owner_id) VALUES (?, ?, ?)')
            ->execute([$companyId, PERSONAL_COMPANY_NAME, $user['id']]);

        $pdo->prepare(
            'INSERT INTO profiles (id, company_id, role, is_active, full_name, email)
             VALUES (?, ?, \'owner\', 1, ?, ?)
             ON DUPLICATE KEY UPDATE
               company_id = VALUES(company_id),
               role       = \'owner\',
               is_active  = 1,
               full_name  = COALESCE(VALUES(full_name), full_name),
               email      = VALUES(email)'
        )->execute([$user['id'], $companyId, $fullName ?: null, $user['email']]);

        $pdo->commit();
        return $companyId;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function remove_personal_company_if_owned(string $userId, string $companyId): void
{
    if (!is_personal_company_id($companyId)) {
        return;
    }
    $stmt = db()->prepare(
        'SELECT id FROM companies WHERE id = ? AND name = ? AND owner_id = ? LIMIT 1'
    );
    $stmt->execute([$companyId, PERSONAL_COMPANY_NAME, $userId]);
    if (!$stmt->fetch()) {
        return;
    }
    db()->prepare('DELETE FROM companies WHERE id = ?')->execute([$companyId]);
}

// /companies routes:
//   GET  /companies?search=ab   -> typeahead list [{id,name}] (prefix match)
//   POST /companies             -> create a company, caller becomes owner
//   POST /companies/join        -> request to join an existing company (pending)
function route_companies(string $method, array $segments): void
{
    $action = $segments[0] ?? null;

    if ($method === 'GET' && $action === null) {
        companies_search();
    }
    if ($method === 'POST' && $action === null) {
        companies_create();
    }
    if ($method === 'POST' && $action === 'join') {
        companies_join();
    }
    json_error('Not found', 404);
}

// GET /companies?search= -> companies whose name starts with the query.
// Returns [] until at least 2 characters are typed (no full directory dump).
function companies_search(): void
{
    require_user();
    $q = trim((string) ($_GET['search'] ?? ''));
    if (mb_strlen($q) < 2) {
        json_response([]);
    }
    $stmt = db()->prepare(
        'SELECT id, name FROM companies
         WHERE name LIKE ? AND name <> ?
         ORDER BY name ASC LIMIT 20'
    );
    $stmt->execute([$q . '%', PERSONAL_COMPANY_NAME]);
    json_response($stmt->fetchAll());
}

// POST /companies { name, full_name } -> creates company, makes caller owner.
// Atomic transaction; replaces the old create_company_and_join RPC.
function companies_create(): void
{
    $user = require_user();
    $name = trim((string) body_field('name', ''));
    $fullName = trim((string) body_field('full_name', ''));
    if ($name === '') {
        json_error('Company name is required', 422);
    }

    $pdo = db();

    $existing = $pdo->prepare('SELECT company_id FROM profiles WHERE id = ? LIMIT 1');
    $existing->execute([$user['id']]);
    $current = $existing->fetch();
    if ($current && $current['company_id'] && !is_personal_company_id($current['company_id'])) {
        json_error('User already belongs to a company', 409);
    }
    if ($current && $current['company_id']) {
        remove_personal_company_if_owned($user['id'], $current['company_id']);
    }

    $pdo->beginTransaction();
    try {
        $companyId = uuid4();
        $pdo->prepare('INSERT INTO companies (id, name, owner_id) VALUES (?, ?, ?)')
            ->execute([$companyId, $name, $user['id']]);

        // Upsert the caller's profile as the owner of the new company.
        $pdo->prepare(
            'INSERT INTO profiles (id, company_id, role, is_active, full_name, email)
             VALUES (?, ?, \'owner\', 1, ?, ?)
             ON DUPLICATE KEY UPDATE
               company_id = VALUES(company_id),
               role       = \'owner\',
               is_active  = 1,
               full_name  = COALESCE(VALUES(full_name), full_name)'
        )->execute([$user['id'], $companyId, $fullName ?: null, $user['email']]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    json_response(['id' => $companyId], 201);
}

// POST /companies/join { company_id, full_name } -> joins as a pending member.
// Profile is created with is_active = 0; an owner/super admin must grant access
// before the user can read or write any company data.
function companies_join(): void
{
    $user = require_user();
    $companyId = trim((string) body_field('company_id', ''));
    $fullName = trim((string) body_field('full_name', ''));
    if ($companyId === '') {
        json_error('Please choose a company to join', 422);
    }

    $pdo = db();

    $company = $pdo->prepare('SELECT id FROM companies WHERE id = ? LIMIT 1');
    $company->execute([$companyId]);
    if (!$company->fetch()) {
        json_error('Company not found', 404);
    }

    $existing = $pdo->prepare('SELECT company_id FROM profiles WHERE id = ? LIMIT 1');
    $existing->execute([$user['id']]);
    $current = $existing->fetch();
    if ($current && $current['company_id'] && !is_personal_company_id($current['company_id'])) {
        json_error('User already belongs to a company', 409);
    }
    if ($current && $current['company_id']) {
        remove_personal_company_if_owned($user['id'], $current['company_id']);
    }

    // Pending membership: role member, is_active = 0 (awaiting approval).
    $pdo->prepare(
        'INSERT INTO profiles (id, company_id, role, is_active, full_name, email)
         VALUES (?, ?, \'member\', 0, ?, ?)
         ON DUPLICATE KEY UPDATE
           company_id = VALUES(company_id),
           role       = \'member\',
           is_active  = 0,
           full_name  = COALESCE(VALUES(full_name), full_name)'
    )->execute([$user['id'], $companyId, $fullName ?: null, $user['email']]);

    json_response(['ok' => true, 'pending' => true], 201);
}

// GET /members and PATCH /members/{id}
function route_members(string $method, array $segments): void
{
    $ctx = require_active_member();

    if ($method === 'GET' && empty($segments)) {
        members_list($ctx);
    }
    if ($method === 'PATCH' && isset($segments[0])) {
        members_update($ctx, $segments[0]);
    }
    json_error('Not found', 404);
}

function members_list(array $ctx): void
{
    if ($ctx['is_super_admin']) {
        $stmt = db()->query('SELECT * FROM profiles ORDER BY created_at ASC');
        $rows = $stmt->fetchAll();
    } else {
        $stmt = db()->prepare('SELECT * FROM profiles WHERE company_id = ? ORDER BY created_at ASC');
        $stmt->execute([$ctx['company_id']]);
        $rows = $stmt->fetchAll();
    }
    foreach ($rows as &$r) {
        $r['is_active'] = (bool) $r['is_active'];
    }
    json_response($rows);
}

function members_update(array $ctx, string $targetId): void
{
    // Only owners and super admins may manage members.
    if (!$ctx['is_super_admin'] && !$ctx['is_owner']) {
        json_error('Not allowed', 403);
    }

    $target = profile_for($targetId);
    if (!$target) {
        json_error('Member not found', 404);
    }
    // Owners can only manage members within their own company.
    if (!$ctx['is_super_admin'] && $target['company_id'] !== $ctx['company_id']) {
        json_error('Not allowed', 403);
    }
    // Guard: cannot change your own role/status (mirrors old trigger).
    if ($targetId === $ctx['user']['id'] && !$ctx['is_super_admin']) {
        json_error('You cannot change your own role or status', 403);
    }
    // Only a super admin may modify another super admin.
    if ($target['role'] === 'super_admin' && !$ctx['is_super_admin']) {
        json_error('Not allowed', 403);
    }

    $sets = [];
    $params = [];

    $role = body_field('role');
    if ($role !== null) {
        if (!in_array($role, ['owner', 'member'], true)) {
            json_error('Invalid role', 422);
        }
        $sets[] = 'role = ?';
        $params[] = $role;
    }

    $isActive = body_field('is_active');
    if ($isActive !== null) {
        $sets[] = 'is_active = ?';
        $params[] = $isActive ? 1 : 0;
    }

    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }

    $params[] = $targetId;
    db()->prepare('UPDATE profiles SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}
