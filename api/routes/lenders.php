<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

const LENDER_FIELDS = ['name', 'phone', 'address', 'notes'];

function route_lenders(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        lenders_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        lenders_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        lenders_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        lenders_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function lenders_list(array $ctx): void
{
    $scope = company_scope($ctx, 'l');
    $stmt = db()->prepare(
        "SELECT l.*,
                (SELECT COUNT(*) FROM loans lo WHERE lo.lender_id = l.id) AS loan_count
         FROM lenders l
         WHERE {$scope['sql']}
         ORDER BY l.name ASC"
    );
    $stmt->execute($scope['params']);
    json_response(array_map('lender_out', $stmt->fetchAll()));
}

function lender_out(array $row): array
{
    $row['loan_count'] = (int) ($row['loan_count'] ?? 0);
    return $row;
}

function lenders_create(array $ctx): void
{
    $body = json_body();
    if (empty(trim((string) ($body['name'] ?? '')))) {
        json_error('Lender name is required', 422);
    }

    $companyId = insert_company_id($ctx);
    $id = uuid4();
    $cols = ['id', 'company_id'];
    $vals = [$id, $companyId];

    foreach (LENDER_FIELDS as $field) {
        if (array_key_exists($field, $body)) {
            $cols[] = $field;
            $value = $body[$field];
            $vals[] = $value === null || trim((string) $value) === '' ? null : trim((string) $value);
        }
    }

    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
    db()->prepare('INSERT INTO lenders (' . implode(', ', $cols) . ") VALUES ($placeholders)")
        ->execute($vals);

    $stmt = db()->prepare('SELECT * FROM lenders WHERE id = ?');
    $stmt->execute([$id]);
    json_response(lender_out($stmt->fetch()), 201);
}

function lenders_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'lenders', $id);
    $body = json_body();

    $sets = [];
    $params = [];
    foreach (LENDER_FIELDS as $field) {
        if (array_key_exists($field, $body)) {
            $sets[] = "$field = ?";
            $value = $body[$field];
            $params[] = $value === null || trim((string) $value) === '' ? null : trim((string) $value);
        }
    }

    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }

    $params[] = $id;
    db()->prepare('UPDATE lenders SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function lenders_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'lenders', $id);

    $stmt = db()->prepare('SELECT COUNT(*) AS c FROM loans WHERE lender_id = ?');
    $stmt->execute([$id]);
    if ((int) $stmt->fetch()['c'] > 0) {
        json_error('Cannot delete lender with existing loans', 422);
    }

    db()->prepare('DELETE FROM lenders WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
