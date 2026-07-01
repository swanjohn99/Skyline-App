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
    case 'milestones':
        require __DIR__ . '/routes/milestones.php';
        route_milestones($method, $segments);
        break;
    case 'leads':
        require __DIR__ . '/routes/leads.php';
        route_leads($method, $segments);
        break;
    case 'entity-contacts':
        require __DIR__ . '/routes/entity_contacts.php';
        route_entity_contacts($method, $segments);
        break;
    case 'entity-project-types':
        require __DIR__ . '/routes/project_types.php';
        route_entity_project_types($method, $segments);
        break;
    case 'project-types':
        require __DIR__ . '/routes/project_types.php';
        route_project_types($method, $segments);
        break;
    case 'vendors':
        require __DIR__ . '/routes/procurement.php';
        route_vendors($method, $segments);
        break;
    case 'chemicals':
        require __DIR__ . '/routes/procurement.php';
        route_chemicals($method, $segments);
        break;
    case 'vendor-pricing':
        require __DIR__ . '/routes/procurement.php';
        route_vendor_pricing($method, $segments);
        break;
    case 'tasks':
        require __DIR__ . '/routes/tasks.php';
        route_tasks($method, $segments);
        break;
    case 'warranties':
        require __DIR__ . '/routes/tasks.php';
        route_warranties($method, $segments);
        break;
    case 'document-templates':
        require __DIR__ . '/routes/documents.php';
        route_document_templates($method, $segments);
        break;
    case 'documents':
        require __DIR__ . '/routes/documents.php';
        route_documents($method, $segments);
        break;
    case 'audit-logs':
        require __DIR__ . '/routes/audit_logs.php';
        route_audit_logs($method, $segments);
        break;
    case 'lenders':
        require __DIR__ . '/routes/lenders.php';
        route_lenders($method, $segments);
        break;
    case 'loans':
        require __DIR__ . '/routes/loans.php';
        route_loans($method, $segments);
        break;
    case 'loan-repayments':
        require __DIR__ . '/routes/loans.php';
        route_loan_repayments($method, $segments);
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
