<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/audit.php';

const PAYMENT_METHODS = ['cash', 'online_transfer', 'cheque'];

function normalize_payment_method(?string $method): string
{
    $value = trim((string) ($method ?? 'cash'));
    if (!in_array($value, PAYMENT_METHODS, true)) {
        json_error('Payment method must be cash, online_transfer, or cheque', 422);
    }
    return $value;
}

function route_payments(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        if (isset($_GET['project_id'])) {
            payments_by_project($ctx, (string) $_GET['project_id']);
        }
        payments_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        payments_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        payments_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        payments_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function payments_list(array $ctx): void
{
    $scope = company_scope($ctx, 'pay');
    $sql = "SELECT pay.id, pay.project_id, pay.amount, pay.payment_date, pay.payment_method, pay.comments,
                   p.project_title, p.client_name
            FROM payments pay
            LEFT JOIN projects p ON p.id = pay.project_id
            WHERE {$scope['sql']}
            ORDER BY pay.payment_date DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($scope['params']);
    json_response(array_map('payment_out', $stmt->fetchAll()));
}

function payments_by_project(array $ctx, string $projectId): void
{
    require_owned_row($ctx, 'projects', $projectId);
    $stmt = db()->prepare(
        'SELECT * FROM payments WHERE project_id = ? ORDER BY payment_date DESC'
    );
    $stmt->execute([$projectId]);
    json_response($stmt->fetchAll());
}

function payments_create(array $ctx): void
{
    $fields = require_fields(['project_id', 'amount', 'payment_date']);
    $amount = (float) $fields['amount'];
    if ($amount < 0) {
        json_error('Amount cannot be negative', 422);
    }
    if ($amount <= 0) {
        json_error('Amount must be greater than zero', 422);
    }
    require_owned_row($ctx, 'projects', (string) $fields['project_id']);
    $companyId = row_company_id('projects', (string) $fields['project_id']);
    $paymentMethod = normalize_payment_method(body_field('payment_method'));
    $comments = body_field('comments');
    $comments = $comments === null || trim((string) $comments) === '' ? null : trim((string) $comments);

    $id = uuid4();
    $pdo = db();
    $pdo->prepare(
        'INSERT INTO payments (id, company_id, project_id, payment_method, amount, payment_date, comments)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $fields['project_id'],
        $paymentMethod,
        $amount,
        $fields['payment_date'],
        $comments,
    ]);
    log_audit_action($pdo, $ctx, 'payments', $id, 'INSERT', null, ['amount' => $fields['amount']]);
    json_response(['id' => $id], 201);
}

function payments_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'payments', $id);
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
    if (array_key_exists('payment_method', $body)) {
        $sets[] = 'payment_method = ?';
        $params[] = normalize_payment_method($body['payment_method']);
    }
    if (array_key_exists('amount', $body)) {
        $amount = (float) $body['amount'];
        if ($amount < 0) {
            json_error('Amount cannot be negative', 422);
        }
        if ($amount <= 0) {
            json_error('Amount must be greater than zero', 422);
        }
        $sets[] = 'amount = ?';
        $params[] = $amount;
    }
    if (array_key_exists('payment_date', $body)) {
        $sets[] = 'payment_date = ?';
        $params[] = $body['payment_date'];
    }
    if (array_key_exists('comments', $body)) {
        $comments = $body['comments'];
        $sets[] = 'comments = ?';
        $params[] = $comments === null || trim((string) $comments) === '' ? null : trim((string) $comments);
    }

    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }

    $params[] = $id;
    $pdo = db();
    $before = $pdo->prepare('SELECT * FROM payments WHERE id = ?');
    $before->execute([$id]);
    $beforeRow = $before->fetch();
    $pdo->prepare('UPDATE payments SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    $after = $pdo->prepare('SELECT * FROM payments WHERE id = ?');
    $after->execute([$id]);
    log_audit_action($pdo, $ctx, 'payments', $id, 'UPDATE', $beforeRow, $after->fetch());
    json_response(['ok' => true]);
}

function payments_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'payments', $id);
    $pdo = db();
    $before = $pdo->prepare('SELECT * FROM payments WHERE id = ?');
    $before->execute([$id]);
    $beforeRow = $before->fetch();
    $pdo->prepare('DELETE FROM payments WHERE id = ?')->execute([$id]);
    log_audit_action($pdo, $ctx, 'payments', $id, 'DELETE', $beforeRow, null);
    json_response(['ok' => true]);
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
