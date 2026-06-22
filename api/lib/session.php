<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

// Cookie-based PHP session. Same-origin SPA (/app) + API (/api) share it.
function boot_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $secure,
        'samesite' => 'Lax',
    ]);
    session_name('skyline_sid');
    session_start();
}

function login_user(string $userId): void
{
    boot_session();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logout_user(): void
{
    boot_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

// Returns the logged-in user row (id + email) or null.
function current_user(): ?array
{
    boot_session();
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

// 401s when not authenticated; otherwise returns the user row.
function require_user(): array
{
    $user = current_user();
    if (!$user) {
        json_error('Not authenticated', 401);
    }
    return $user;
}

// Profile row for a user id (role, company_id, is_active, ...), or null.
function profile_for(string $userId): ?array
{
    $stmt = db()->prepare('SELECT * FROM profiles WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

// Resolves the caller's auth context: user + profile + derived flags.
// Mirrors the old Postgres helpers (current_company_id, is_super_admin, ...).
function auth_context(): array
{
    $user = require_user();
    $profile = profile_for($user['id']);
    $role = $profile['role'] ?? null;
    $companyId = $profile['company_id'] ?? null;
    $isActive = $profile ? (bool) $profile['is_active'] : false;

    return [
        'user'           => $user,
        'profile'        => $profile,
        'role'           => $role,
        'company_id'     => $companyId,
        'is_super_admin' => $role === 'super_admin',
        'is_owner'       => $role === 'owner',
        'is_active'      => $isActive,
    ];
}

// Caller must be an active member of a company (or a super admin).
// Returns the auth context. 403 otherwise.
function require_active_member(): array
{
    $ctx = auth_context();
    if ($ctx['is_super_admin']) {
        return $ctx;
    }
    if (!$ctx['company_id'] || !$ctx['is_active']) {
        json_error('No active company membership', 403);
    }
    return $ctx;
}

// Super admin only; 403 for everyone else.
function require_super_admin(): array
{
    $ctx = auth_context();
    if (!$ctx['is_super_admin']) {
        json_error('Not allowed', 403);
    }
    return $ctx;
}

// Context for business-data endpoints.
// - Super admin: full access; optional ?company_id= scopes reads/writes.
// - Active company member: scoped to their company.
// - Pending member (inactive): 403.
function data_context(bool $write = false): array
{
    $ctx = auth_context();
    if ($ctx['is_super_admin']) {
        return $ctx;
    }
    if (!$ctx['profile']) {
        json_error('Complete onboarding first', 403);
    }
    if (!$ctx['company_id']) {
        json_error('Complete onboarding first', 403);
    }
    if (!$ctx['is_active']) {
        json_error('No active company membership', 403);
    }
    return $ctx;
}

// SQL fragment + bound params that scope a business table to the caller's
// company. Super admins get full visibility unless ?company_id= is set.
function company_scope(array $ctx, string $alias = ''): array
{
    $prefix = $alias === '' ? '' : ($alias . '.');
    if ($ctx['is_super_admin']) {
        $viewAs = trim((string) ($_GET['company_id'] ?? ''));
        if ($viewAs !== '') {
            return ['sql' => $prefix . 'company_id = ?', 'params' => [$viewAs]];
        }
        return ['sql' => '1=1', 'params' => []];
    }
    return [
        'sql'    => $prefix . 'company_id = ?',
        'params' => [$ctx['company_id']],
    ];
}

// Company id to stamp on INSERT for the current caller.
function insert_company_id(array $ctx, ?string $fromRow = null): string
{
    if ($fromRow) {
        return $fromRow;
    }
    if ($ctx['is_super_admin']) {
        $viewAs = trim((string) (body_field('company_id') ?? $_GET['company_id'] ?? ''));
        if ($viewAs !== '') {
            return $viewAs;
        }
        json_error('Select a company from the sidebar before adding data', 422);
    }
    return $ctx['company_id'];
}

// Returns the company_id of a row (assumes the row exists / was authorized).
function row_company_id(string $table, string $id): ?string
{
    $stmt = db()->prepare("SELECT company_id FROM $table WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? $row['company_id'] : null;
}

// Ensures a row exists and belongs to the caller's company (super admin bypass).
// 404 when missing, 403 when it belongs to another company.
function require_owned_row(array $ctx, string $table, string $id): void
{
    $stmt = db()->prepare("SELECT company_id FROM $table WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Not found', 404);
    }
    if (!$ctx['is_super_admin'] && $row['company_id'] !== $ctx['company_id']) {
        json_error('Not allowed', 403);
    }
}
