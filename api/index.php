<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/session.php';

// Unhandled errors -> JSON 500 (never leak HTML/stack traces to the SPA).
set_exception_handler(function (Throwable $e): void {
    error_log('API error: ' . $e->getMessage());
    json_error('Server error', 500);
});

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Derive the path after "/api/". Works regardless of subdirectory depth.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$uri = rawurldecode($uri);
$pos = strpos($uri, '/api/');
$path = $pos !== false ? substr($uri, $pos + 5) : ltrim($uri, '/');
$path = trim($path, '/');
$segments = $path === '' ? [] : explode('/', $path);

if (empty($segments)) {
    json_response(['name' => 'skyline-api', 'status' => 'ok']);
}

$resource = array_shift($segments);

switch ($resource) {
    case 'auth':
        require __DIR__ . '/routes/auth.php';
        route_auth($method, $segments);
        break;
    case 'profile':
        require __DIR__ . '/routes/profile.php';
        route_profile($method, $segments);
        break;
    case 'companies':
        require __DIR__ . '/routes/profile.php';
        route_companies($method, $segments);
        break;
    case 'members':
        require __DIR__ . '/routes/profile.php';
        route_members($method, $segments);
        break;
    case 'customer-accounts':
        require __DIR__ . '/routes/customer_accounts.php';
        route_customer_accounts($method, $segments);
        break;
    case 'clients':
        require __DIR__ . '/routes/clients.php';
        route_clients($method, $segments);
        break;
    case 'projects':
        require __DIR__ . '/routes/projects.php';
        route_projects($method, $segments);
        break;
    case 'expenses':
        require __DIR__ . '/routes/expenses.php';
        route_expenses($method, $segments);
        break;
    case 'payments':
        require __DIR__ . '/routes/payments.php';
        route_payments($method, $segments);
        break;
    case 'dashboard':
        require __DIR__ . '/routes/dashboard.php';
        route_dashboard($method, $segments);
        break;
    case 'admin':
        require __DIR__ . '/routes/admin.php';
        route_admin($method, $segments);
        break;
    default:
        json_error('Not found', 404);
}
