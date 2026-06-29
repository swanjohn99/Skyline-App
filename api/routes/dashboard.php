<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

// GET /dashboard -> everything the dashboard needs in one response.
// Replaces the 5 parallel Supabase calls in the old src/api/dashboard.js.
function route_dashboard(string $method, array $segments): void
{
    if ($method !== 'GET') {
        json_error('Method not allowed', 405);
    }
    $ctx = data_context(false);
    $scope = company_scope($ctx);
    $pdo = db();

    $closed = ['completed', 'rejected'];
    $closedPlaceholders = implode(', ', array_fill(0, count($closed), '?'));

    // Active = not in a closed status.
    $activeStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM projects
         WHERE {$scope['sql']} AND status NOT IN ($closedPlaceholders)"
    );
    $activeStmt->execute([...$scope['params'], ...$closed]);
    $activeCount = (int) $activeStmt->fetch()['c'];

    // Total = everything except rejected.
    $totalStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM projects WHERE {$scope['sql']} AND status <> 'rejected'"
    );
    $totalStmt->execute($scope['params']);
    $totalCount = (int) $totalStmt->fetch()['c'];

    $projectsStmt = $pdo->prepare(
        "SELECT status, end_date, total_quoted_amount FROM projects WHERE {$scope['sql']}"
    );
    $projectsStmt->execute($scope['params']);

    $expensesStmt = $pdo->prepare(
        "SELECT amount, expense_date, expense_type FROM expenses WHERE {$scope['sql']}"
    );
    $expensesStmt->execute($scope['params']);

    $paymentsStmt = $pdo->prepare(
        "SELECT amount, payment_date FROM payments WHERE {$scope['sql']}"
    );
    $paymentsStmt->execute($scope['params']);

    json_response([
        'activeCount' => $activeCount,
        'totalCount'  => $totalCount,
        'projects'    => $projectsStmt->fetchAll(),
        'expenses'    => $expensesStmt->fetchAll(),
        'payments'    => $paymentsStmt->fetchAll(),
    ]);
}
