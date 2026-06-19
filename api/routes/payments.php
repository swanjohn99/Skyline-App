<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

function route_payments(string $method, array $segments): void
{
    $ctx = require_active_member();

    if ($method === 'GET' && empty($segments)) {
        payments_list($ctx);
    }
    if ($method === 'POST' && empty($segments)) {
        payments_create($ctx);
    }
    json_error('Not found', 404);
}

// Shapes rows with nested { projects: { project_title, client_name } }.
function payments_list(array $ctx): void
{
    $scope = company_scope($ctx, 'pay');
    $sql = "SELECT pay.id, pay.amount, pay.payment_date,
                   p.project_title, p.client_name
            FROM payments pay
            LEFT JOIN projects p ON p.id = pay.project_id
            WHERE {$scope['sql']}
            ORDER BY pay.payment_date DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($scope['params']);
    json_response(array_map('payment_out', $stmt->fetchAll()));
}

function payments_create(array $ctx): void
{
    $fields = require_fields(['project_id', 'amount', 'payment_date']);
    require_owned_row($ctx, 'projects', (string) $fields['project_id']);
    $companyId = row_company_id('projects', (string) $fields['project_id']);

    $id = uuid4();
    db()->prepare(
        'INSERT INTO payments (id, company_id, project_id, amount, payment_date)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $fields['project_id'],
        $fields['amount'],
        $fields['payment_date'],
    ]);
    json_response(['id' => $id], 201);
}

function payment_out(array $row): array
{
    $row['projects'] = [
        'project_title' => $row['project_title'],
        'client_name'   => $row['client_name'],
    ];
    unset($row['project_title'], $row['client_name']);
    return $row;
}
