<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

function route_expenses(string $method, array $segments): void
{
    $ctx = require_active_member();

    if ($method === 'GET' && empty($segments)) {
        if (isset($_GET['project_id'])) {
            expenses_by_project($ctx, (string) $_GET['project_id']);
        }
        expenses_list($ctx);
    }
    if ($method === 'POST' && empty($segments)) {
        expenses_create($ctx);
    }
    json_error('Not found', 404);
}

// Shapes each row to include nested { projects: { project_title, client_name } }
// to match the old Supabase relational select used by the frontend.
function expenses_list(array $ctx): void
{
    $scope = company_scope($ctx, 'e');
    $sql = "SELECT e.id, e.amount, e.description, e.expense_date,
                   p.project_title, p.client_name
            FROM expenses e
            LEFT JOIN projects p ON p.id = e.project_id
            WHERE {$scope['sql']}
            ORDER BY e.expense_date DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($scope['params']);
    json_response(array_map('expense_out', $stmt->fetchAll()));
}

function expenses_by_project(array $ctx, string $projectId): void
{
    require_owned_row($ctx, 'projects', $projectId);
    $stmt = db()->prepare(
        'SELECT * FROM expenses WHERE project_id = ? ORDER BY expense_date DESC'
    );
    $stmt->execute([$projectId]);
    json_response($stmt->fetchAll());
}

function expenses_create(array $ctx): void
{
    $fields = require_fields(['project_id', 'amount', 'expense_date']);
    require_owned_row($ctx, 'projects', (string) $fields['project_id']);
    $companyId = row_company_id('projects', (string) $fields['project_id']);

    $id = uuid4();
    db()->prepare(
        'INSERT INTO expenses (id, company_id, project_id, amount, description, expense_date)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $fields['project_id'],
        $fields['amount'],
        body_field('description'),
        $fields['expense_date'],
    ]);
    json_response(['id' => $id], 201);
}

function expense_out(array $row): array
{
    $row['projects'] = [
        'project_title' => $row['project_title'],
        'client_name'   => $row['client_name'],
    ];
    unset($row['project_title'], $row['client_name']);
    return $row;
}
