<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

const EXPENSE_TYPES = ['material', 'labour', 'transportation', 'other'];

function normalize_expense_type(?string $type): string
{
    $value = trim((string) ($type ?? 'other'));
    if (!in_array($value, EXPENSE_TYPES, true)) {
        json_error('Expense type must be material, labour, transportation, or other', 422);
    }
    return $value;
}

function route_expenses(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        if (isset($_GET['project_id'])) {
            expenses_by_project($ctx, (string) $_GET['project_id']);
        }
        expenses_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        expenses_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        expenses_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        expenses_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function expenses_list(array $ctx): void
{
    $scope = company_scope($ctx, 'e');
    $sql = "SELECT e.id, e.project_id, e.amount, e.description, e.expense_date, e.expense_type,
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
    $expenseType = normalize_expense_type(body_field('expense_type'));

    $id = uuid4();
    db()->prepare(
        'INSERT INTO expenses (id, company_id, project_id, expense_type, amount, description, expense_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $fields['project_id'],
        $expenseType,
        $fields['amount'],
        body_field('description'),
        $fields['expense_date'],
    ]);
    json_response(['id' => $id], 201);
}

function expenses_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'expenses', $id);
    $body = json_body();

    $sets = [];
    $params = [];

    if (array_key_exists('project_id', $body)) {
        require_owned_row($ctx, 'projects', (string) $body['project_id']);
        $sets[] = 'project_id = ?';
        $params[] = $body['project_id'];
        $sets[] = 'company_id = ?';
        $params[] = row_company_id('projects', (string) $body['project_id']);
    }
    if (array_key_exists('expense_type', $body)) {
        $sets[] = 'expense_type = ?';
        $params[] = normalize_expense_type($body['expense_type']);
    }
    if (array_key_exists('amount', $body)) {
        $sets[] = 'amount = ?';
        $params[] = $body['amount'];
    }
    if (array_key_exists('description', $body)) {
        $sets[] = 'description = ?';
        $params[] = $body['description'] === '' ? null : $body['description'];
    }
    if (array_key_exists('expense_date', $body)) {
        $sets[] = 'expense_date = ?';
        $params[] = $body['expense_date'];
    }

    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }

    $params[] = $id;
    db()->prepare('UPDATE expenses SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function expenses_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'expenses', $id);
    db()->prepare('DELETE FROM expenses WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
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
