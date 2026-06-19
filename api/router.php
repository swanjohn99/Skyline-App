<?php
// Router for the PHP built-in dev server, since it does not read .htaccess.
//   php -S localhost:8000 api/router.php
// Forwards every /api/* request to the front controller; serves real files
// (outside /api) as-is.

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/index.php';
    return true;
}

// Let the built-in server serve other static files normally.
return false;
