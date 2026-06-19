<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

// GET /profile -> profile row with nested { companies: { name } } or null.
function route_profile(string $method, array $segments): void
{
    if ($method !== 'GET') {
        json_error('Method not allowed', 405);
    }
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

    $companies = $row['company_name'] !== null ? ['name' => $row['company_name']] : null;
    unset($row['company_name']);
    $row['is_active'] = (bool) $row['is_active'];
    $row['companies'] = $companies;
    json_response($row);
}

// POST /companies { name, full_name } -> creates company, makes caller owner.
// Atomic transaction; replaces the old create_company_and_join RPC.
function route_companies(string $method, array $segments): void
{
    if ($method !== 'POST') {
        json_error('Method not allowed', 405);
    }
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
    if ($current && $current['company_id']) {
        json_error('User already belongs to a company', 409);
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
