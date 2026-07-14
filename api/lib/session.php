<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';

const SESSION_IDLE_MINUTES = 30;
const SESSION_REMEMBER_DAYS = 30;
const SESSION_WARNING_MINUTES = 2;

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

function client_ip(): string
{
    $forwarded = trim((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
    if ($forwarded !== '') {
        $parts = explode(',', $forwarded);
        $first = trim($parts[0]);
        if ($first !== '') {
            return $first;
        }
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function session_remember_active(?string $rememberUntil): bool
{
    if ($rememberUntil === null || $rememberUntil === '') {
        return false;
    }
    return (new DateTimeImmutable($rememberUntil)) > new DateTimeImmutable();
}

function session_idle_window_minutes(?string $rememberUntil): int
{
    return session_remember_active($rememberUntil)
        ? SESSION_REMEMBER_DAYS * 24 * 60
        : SESSION_IDLE_MINUTES;
}

function session_is_active(?string $token, ?string $lastSeen, ?string $rememberUntil = null): bool
{
    if ($token === null || $token === '') {
        return false;
    }
    if ($lastSeen === null || $lastSeen === '') {
        return false;
    }
    $seen = new DateTimeImmutable($lastSeen);
    $cutoff = (new DateTimeImmutable())->modify('-' . session_idle_window_minutes($rememberUntil) . ' minutes');
    return $seen >= $cutoff;
}

// ISO-8601 timestamp when the session will expire from inactivity. Null if no session.
function session_expires_at(?string $lastSeen, ?string $rememberUntil): ?string
{
    if ($lastSeen === null || $lastSeen === '') {
        return null;
    }
    $seen = new DateTimeImmutable($lastSeen);
    return $seen->modify('+' . session_idle_window_minutes($rememberUntil) . ' minutes')->format(DATE_ATOM);
}

// Metadata for the frontend to drive the idle warning + heartbeat.
function session_meta(?string $lastSeen, ?string $rememberUntil): array
{
    return [
        'idle_timeout_minutes' => session_idle_window_minutes($rememberUntil),
        'warning_minutes'      => SESSION_WARNING_MINUTES,
        'remember'             => session_remember_active($rememberUntil),
        'expires_at'           => session_expires_at($lastSeen, $rememberUntil),
    ];
}

function clear_user_active_session(string $userId): void
{
    db()->prepare(
        'UPDATE users
         SET active_login_ip = NULL,
             active_session_token = NULL,
             session_last_seen = NULL,
             session_remember_until = NULL
         WHERE id = ?'
    )->execute([$userId]);
}

function bind_user_session(string $userId, string $ip, string $token, bool $remember): void
{
    $rememberUntil = $remember
        ? (new DateTimeImmutable('+' . SESSION_REMEMBER_DAYS . ' days'))->format('Y-m-d H:i:s')
        : null;
    db()->prepare(
        'UPDATE users
         SET active_login_ip = ?,
             active_session_token = ?,
             session_last_seen = NOW(),
             session_remember_until = ?
         WHERE id = ?'
    )->execute([$ip, $token, $rememberUntil, $userId]);
}

function touch_user_session(string $userId): void
{
    db()->prepare('UPDATE users SET session_last_seen = NOW() WHERE id = ?')->execute([$userId]);
}

// New login always kicks any previous session — the old token is overwritten in DB,
// so the previous tab gets a 401 on its next request (token mismatch).
function login_user(string $userId, bool $remember = false): void
{
    $token = bin2hex(random_bytes(32));
    bind_user_session($userId, client_ip(), $token, $remember);

    boot_session();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['session_token'] = $token;
}

function logout_user(): void
{
    boot_session();
    $userId = $_SESSION['user_id'] ?? null;
    if ($userId) {
        clear_user_active_session((string) $userId);
    }
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function invalidate_local_session(): void
{
    boot_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

// Returns the logged-in user row (id, email, plus session meta) or null.
function current_user(): ?array
{
    boot_session();
    $userId = $_SESSION['user_id'] ?? null;
    $sessionToken = $_SESSION['session_token'] ?? null;
    if (!$userId || !$sessionToken) {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT id, email, active_session_token, session_last_seen, session_remember_until
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) {
        invalidate_local_session();
        return null;
    }

    if (!hash_equals((string) $user['active_session_token'], (string) $sessionToken)) {
        invalidate_local_session();
        return null;
    }

    $rememberUntil = $user['session_remember_until'] ?? null;
    if (!session_is_active($user['active_session_token'], $user['session_last_seen'], $rememberUntil)) {
        clear_user_active_session($userId);
        invalidate_local_session();
        return null;
    }

    touch_user_session($userId);
    $user['session'] = session_meta(
        (new DateTimeImmutable())->format('Y-m-d H:i:s'),
        $rememberUntil
    );
    unset(
        $user['active_session_token'],
        $user['session_last_seen'],
        $user['session_remember_until']
    );
    return $user;
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

// SQL fragment + bound params that scope a business table to the caller's company.
// Super admins get full visibility unless ?company_id= is set.
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
