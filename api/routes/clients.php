<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

const CLIENT_FIELDS = ['name', 'email', 'phone', 'address', 'location', 'source', 'tags', 'notes'];

function client_out(array $row): array
{
    $row['tags'] = $row['tags'] !== null ? (json_decode($row['tags'], true) ?: []) : [];
    return $row;
}

function route_clients(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        clients_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        clients_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        clients_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        clients_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function clients_list(array $ctx): void
{
    $scope = company_scope($ctx);
    $stmt = db()->prepare("SELECT * FROM clients WHERE {$scope['sql']} ORDER BY created_at DESC");
    $stmt->execute($scope['params']);
    json_response(array_map('client_out', $stmt->fetchAll()));
}

function clients_create(array $ctx): void
{
    $body = json_body();
    if (empty($body['name'])) {
        json_error('Name is required', 422);
    }

    $companyId = insert_company_id($ctx);
    $id = uuid4();
    $cols = ['id', 'company_id'];
    $vals = [$id, $companyId];
    foreach (CLIENT_FIELDS as $f) {
        if (array_key_exists($f, $body)) {
            $cols[] = $f;
            $vals[] = $f === 'tags' ? json_encode($body[$f] ?? []) : $body[$f];
        }
    }
    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
    db()->prepare('INSERT INTO clients (' . implode(', ', $cols) . ") VALUES ($placeholders)")
        ->execute($vals);

    $stmt = db()->prepare('SELECT * FROM clients WHERE id = ?');
    $stmt->execute([$id]);
    json_response(client_out($stmt->fetch()), 201);
}

function clients_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'clients', $id);
    $body = json_body();

    $sets = [];
    $params = [];
    foreach (CLIENT_FIELDS as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            $params[] = $f === 'tags' ? json_encode($body[$f] ?? []) : $body[$f];
        }
    }
    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }
    $params[] = $id;
    db()->prepare('UPDATE clients SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function clients_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'clients', $id);
    db()->prepare('DELETE FROM clients WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
