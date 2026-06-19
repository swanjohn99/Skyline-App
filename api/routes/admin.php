<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

function route_admin(string $method, array $segments): void
{
    $ctx = require_super_admin();
    $resource = $segments[0] ?? null;
    $id = $segments[1] ?? null;

    if ($resource === 'companies') {
        if ($method === 'GET' && $id === null) {
            admin_list_companies();
        }
        if ($method === 'DELETE' && $id !== null) {
            admin_delete_company($id);
        }
    }

    if ($resource === 'users') {
        if ($method === 'GET' && $id === null) {
            admin_list_users();
        }
        if ($method === 'DELETE' && $id !== null) {
            admin_delete_user($ctx, $id);
        }
        if ($method === 'PATCH' && $id !== null) {
            admin_update_user($id);
        }
    }

    json_error('Not found', 404);
}

function admin_list_companies(): void
{
    $stmt = db()->query(
        'SELECT c.id, c.name, c.owner_id, c.created_at,
                COUNT(p.id) AS member_count
         FROM companies c
         LEFT JOIN profiles p ON p.company_id = c.id
         GROUP BY c.id, c.name, c.owner_id, c.created_at
         ORDER BY c.name ASC'
    );
    json_response($stmt->fetchAll());
}

function admin_delete_company(string $id): void
{
    $stmt = db()->prepare('SELECT id FROM companies WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        json_error('Company not found', 404);
    }
    db()->prepare('DELETE FROM companies WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function admin_list_users(): void
{
    $stmt = db()->query(
        'SELECT u.id, u.email, u.created_at AS user_created_at,
                p.role, p.is_active, p.company_id, p.full_name, p.created_at AS profile_created_at,
                c.name AS company_name
         FROM users u
         LEFT JOIN profiles p ON p.id = u.id
         LEFT JOIN companies c ON c.id = p.company_id
         ORDER BY u.created_at DESC'
    );
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        if ($r['is_active'] !== null) {
            $r['is_active'] = (bool) $r['is_active'];
        }
    }
    json_response($rows);
}

function admin_delete_user(array $ctx, string $id): void
{
    if ($id === $ctx['user']['id']) {
        json_error('You cannot delete your own account', 403);
    }
    $stmt = db()->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        json_error('User not found', 404);
    }
    db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function admin_update_user(string $id): void
{
    $userStmt = db()->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
    $userStmt->execute([$id]);
    $userRow = $userStmt->fetch();
    if (!$userRow) {
        json_error('User not found', 404);
    }

    $target = profile_for($id);
    if (!$target) {
        db()->prepare(
            'INSERT INTO profiles (id, email, role, is_active, company_id)
             VALUES (?, ?, \'member\', 1, NULL)'
        )->execute([$id, $userRow['email']]);
        $target = profile_for($id);
    }

    $profileSets = [];
    $profileParams = [];

    $role = body_field('role');
    if ($role !== null) {
        if (!in_array($role, ['super_admin', 'owner', 'member'], true)) {
            json_error('Invalid role', 422);
        }
        $profileSets[] = 'role = ?';
        $profileParams[] = $role;
    }

    $isActive = body_field('is_active');
    if ($isActive !== null) {
        $profileSets[] = 'is_active = ?';
        $profileParams[] = $isActive ? 1 : 0;
    }

    $companyId = body_field('company_id');
    if ($companyId !== null) {
        if ($companyId === '' || $companyId === false) {
            $profileSets[] = 'company_id = NULL';
        } else {
            $check = db()->prepare('SELECT id FROM companies WHERE id = ? LIMIT 1');
            $check->execute([(string) $companyId]);
            if (!$check->fetch()) {
                json_error('Company not found', 404);
            }
            $profileSets[] = 'company_id = ?';
            $profileParams[] = (string) $companyId;
        }
    }

    $fullName = body_field('full_name');
    if ($fullName !== null) {
        $profileSets[] = 'full_name = ?';
        $profileParams[] = $fullName === '' ? null : $fullName;
    }

    if (!empty($profileSets)) {
        $profileParams[] = $id;
        db()->prepare('UPDATE profiles SET ' . implode(', ', $profileSets) . ' WHERE id = ?')
            ->execute($profileParams);
        json_response(['ok' => true]);
    }

    json_error('Nothing to update', 422);
}
