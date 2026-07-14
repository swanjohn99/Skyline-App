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

    // Active = not closed and not 100% complete.
    $activeStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM projects
         WHERE {$scope['sql']} AND status NOT IN ($closedPlaceholders)
         AND COALESCE(completion_percent, 0) < 100"
    );
    $activeStmt->execute([...$scope['params'], ...$closed]);
    $activeCount = (int) $activeStmt->fetch()['c'];

    // Total = everything except rejected.
    $totalStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM projects WHERE {$scope['sql']} AND status <> 'rejected'"
    );
    $totalStmt->execute($scope['params']);
    $totalCount = (int) $totalStmt->fetch()['c'];

    $completedYearStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM projects
         WHERE {$scope['sql']} AND status IN ('work completed', 'completed')
         AND YEAR(COALESCE(end_date, created_at)) = YEAR(CURDATE())"
    );
    $completedYearStmt->execute($scope['params']);
    $completedCountYear = (int) $completedYearStmt->fetch()['c'];

    $totalYearStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM projects
         WHERE {$scope['sql']} AND status <> 'rejected'
         AND YEAR(created_at) = YEAR(CURDATE())"
    );
    $totalYearStmt->execute($scope['params']);
    $totalCountYear = (int) $totalYearStmt->fetch()['c'];

    $leadsScope = company_scope($ctx, 'l');
    $leadsStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM leads l
         WHERE {$leadsScope['sql']} AND l.status <> 'converted'"
    );
    $leadsStmt->execute($leadsScope['params']);
    $leadsCount = (int) $leadsStmt->fetch()['c'];

    $projectsStmt = $pdo->prepare(
        "SELECT p.id, p.project_title, p.client_name, p.status, p.end_date, p.total_quoted_amount,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE project_id = p.id) AS amount_received
         FROM projects p
         WHERE {$scope['sql']} AND p.status <> 'rejected'"
    );
    $projectsStmt->execute($scope['params']);
    $projectRows = $projectsStmt->fetchAll();

    $pendingProjects = [];
    $totalPending = 0.0;
    foreach ($projectRows as $row) {
        $quoted = (float) ($row['total_quoted_amount'] ?? 0);
        if ($quoted <= 0) {
            continue;
        }
        $received = (float) ($row['amount_received'] ?? 0);
        $pending = $quoted - $received;
        if ($pending <= 0) {
            continue;
        }
        $pendingProjects[] = [
            'id' => $row['id'],
            'project_title' => $row['project_title'],
            'client_name' => $row['client_name'],
            'total_quoted_amount' => $quoted,
            'amount_received' => $received,
            'pending' => $pending,
        ];
        $totalPending += $pending;
    }
    usort($pendingProjects, static fn ($a, $b) => $b['pending'] <=> $a['pending']);

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
        'completedCountYear' => $completedCountYear,
        'totalCountYear' => $totalCountYear,
        'leadsCount' => $leadsCount,
        'totalPending' => $totalPending,
        'pendingProjects' => $pendingProjects,
        'projects'    => $projectRows,
        'expenses'    => $expensesStmt->fetchAll(),
        'payments'    => $paymentsStmt->fetchAll(),
    ]);
}
