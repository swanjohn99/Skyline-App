<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/mailer.php';

function route_auth(string $method, array $segments): void
{
    $action = $segments[0] ?? '';

    switch ("$method $action") {
        case 'GET session':
            auth_session();
            break;
        case 'POST signup':
            auth_signup();
            break;
        case 'POST login':
            auth_login();
            break;
        case 'POST logout':
            auth_logout();
            break;
        case 'POST heartbeat':
            auth_heartbeat();
            break;
        case 'POST forgot-password':
            auth_forgot_password();
            break;
        case 'POST reset-password':
            auth_reset_password();
            break;
        default:
            json_error('Not found', 404);
    }
}

// GET /auth/session -> { user: {id,email} | null, session: {...} | null }
function auth_session(): void
{
    $user = current_user();
    if (!$user) {
        json_response(['user' => null, 'session' => null]);
    }
    $session = $user['session'] ?? null;
    unset($user['session']);
    json_response(['user' => $user, 'session' => $session]);
}

// POST /auth/heartbeat -> touches session_last_seen, returns fresh session meta.
function auth_heartbeat(): void
{
    $user = require_user();
    $session = $user['session'] ?? null;
    unset($user['session']);
    json_response(['user' => $user, 'session' => $session]);
}

// POST /auth/signup { email, password } -> creates user + auto login
function auth_signup(): void
{
    $fields = require_fields(['email', 'password']);
    $email = strtolower(trim((string) $fields['email']));
    $password = (string) $fields['password'];

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Enter a valid email address', 422);
    }
    if (strlen($password) < 6) {
        json_error('Password must be at least 6 characters', 422);
    }

    $pdo = db();
    $exists = $pdo->prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1');
    $exists->execute([$email]);
    if ($exists->fetch()) {
        json_error('An account with this email already exists', 409);
    }

    $id = uuid4();
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
        ->execute([$id, $email, $hash]);

    $remember = (bool) body_field('remember_me', false);
    login_user($id, $remember);
    $current = current_user();
    $session = $current['session'] ?? null;
    json_response(['user' => ['id' => $id, 'email' => $email], 'session' => $session], 201);
}

// POST /auth/login { email, password }
function auth_login(): void
{
    $fields = require_fields(['email', 'password']);
    $email = strtolower(trim((string) $fields['email']));
    $password = (string) $fields['password'];

    $stmt = db()->prepare('SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_error('Invalid email or password', 401);
    }

    $remember = (bool) body_field('remember_me', false);
    login_user($user['id'], $remember);
    $current = current_user();
    $session = $current['session'] ?? null;
    json_response(['user' => ['id' => $user['id'], 'email' => $user['email']], 'session' => $session]);
}

// POST /auth/logout
function auth_logout(): void
{
    logout_user();
    json_response(['ok' => true]);
}

// POST /auth/forgot-password { email }
// Always returns ok (does not reveal whether an account exists).
function auth_forgot_password(): void
{
    $email = strtolower(trim((string) body_field('email', '')));
    if ($email === '') {
        json_error('Email is required', 422);
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $expires = (new DateTimeImmutable('+1 hour'))->format('Y-m-d H:i:s');

        // Invalidate previous reset tokens for this user.
        $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$user['id']]);
        $pdo->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
            ->execute([$user['id'], $tokenHash, $expires]);

        $config = require __DIR__ . '/../config.php';
        $link = $config['app']['app_url'] . '/reset?token=' . $token;
        $html = '<p>We received a request to reset your Skyline Constructions password.</p>'
            . '<p><a href="' . htmlspecialchars($link, ENT_QUOTES) . '">Click here to reset your password</a>. '
            . 'This link expires in 1 hour.</p>'
            . '<p>If you did not request this, you can safely ignore this email.</p>';
        send_mail($email, 'Reset your Skyline password', $html);
    }

    json_response(['ok' => true]);
}

// POST /auth/reset-password { token, password }
function auth_reset_password(): void
{
    $fields = require_fields(['token', 'password']);
    $token = (string) $fields['token'];
    $password = (string) $fields['password'];

    if (strlen($password) < 6) {
        json_error('Password must be at least 6 characters', 422);
    }

    $tokenHash = hash('sha256', $token);
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT id, user_id FROM password_resets WHERE token_hash = ? AND expires_at > NOW() LIMIT 1'
    );
    $stmt->execute([$tokenHash]);
    $row = $stmt->fetch();

    if (!$row) {
        json_error('This reset link is invalid or has expired', 400);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, $row['user_id']]);
    $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$row['user_id']]);

    json_response(['ok' => true]);
}
