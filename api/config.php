<?php
// Loads configuration from api/.env (KEY=VALUE lines) into a config array.
// Falls back to sane defaults for local development.

declare(strict_types=1);

function load_env(string $path): void
{
    if (!is_file($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $eq = strpos($line, '=');
        if ($eq === false) {
            continue;
        }
        $key = trim(substr($line, 0, $eq));
        $value = trim(substr($line, $eq + 1));
        // Strip optional surrounding quotes.
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }
        if (getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

load_env(__DIR__ . '/.env');

function env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

return [
    'db' => [
        'host'    => env('DB_HOST', 'localhost'),
        'port'    => env('DB_PORT', '3306'),
        'name'    => env('DB_NAME', 'yjxgxlqh_adminskyline'),
        'user'    => env('DB_USER', 'yjxgxlqh_backendadminskyline'),
        'pass'    => env('DB_PASS', 'XPnvfSezAPs8qrFtUdGt'),
        'charset' => 'utf8mb4',
    ],
    'app' => [
        // Public base URL of the SPA, used to build password-reset links.
        'app_url' => rtrim(env('APP_URL', 'https://admin.skylineconstructions.in') ?? '', '/'),
        'env'     => env('APP_ENV', 'production'),
    ],
    'mail' => [
        'smtp_host' => env('SMTP_HOST'),
        'smtp_port' => (int) (env('SMTP_PORT', '587')),
        'smtp_user' => env('SMTP_USER'),
        'smtp_pass' => env('SMTP_PASS'),
        'smtp_secure' => env('SMTP_SECURE', 'tls'), // tls | ssl | none
        'from'      => env('MAIL_FROM', 'no-reply@skylineconstructions.in'),
        'from_name' => env('MAIL_FROM_NAME', 'Skyline Constructions'),
    ],
];
