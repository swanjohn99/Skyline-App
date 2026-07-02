<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/customer_accounts.php';

const CLIENT_FIELDS = [
    'name', 'client_type', 'customer_account_id', 'contact_title',
    'email', 'phone', 'address', 'location', 'source', 'tags', 'notes',
];
const CLIENT_TYPES = ['b2c', 'b2b'];

function normalize_client_type(?string $type): string
{
    $value = trim((string) ($type ?? 'b2c'));
    if ($value === 'private_client') {
        $value = 'b2c';
    }
    if ($value === 'contractor') {
        $value = 'b2b';
    }
    if (!in_array($value, CLIENT_TYPES, true)) {
        json_error('Client type must be b2c or b2b', 422);
    }
    return $value;
}

function client_out(array $row): array
{
    $row['tags'] = $row['tags'] !== null ? (json_decode($row['tags'], true) ?: []) : [];

    if (!empty($row['customer_account_id']) && !empty($row['account_name'])) {
        $row['customer_account'] = [
            'id'       => $row['customer_account_id'],
            'name'     => $row['account_name'],
            'phone'    => $row['account_phone'] ?? null,
            'email'    => $row['account_email'] ?? null,
            'location' => $row['account_location'] ?? null,
            'address'  => $row['account_address'] ?? null,
            'notes'    => $row['account_notes'] ?? null,
        ];
    } else {
        $row['customer_account'] = null;
    }

    unset(
        $row['account_name'],
        $row['account_phone'],
        $row['account_email'],
        $row['account_location'],
        $row['account_address'],
        $row['account_notes']
    );

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
    if ($method === 'GET' && $id !== null) {
        clients_get($ctx, $id);
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

function clients_select_sql(): string
{
    return 'SELECT c.*,
                   a.name AS account_name,
                   a.phone AS account_phone,
                   a.email AS account_email,
                   a.location AS account_location,
                   a.address AS account_address,
                   a.notes AS account_notes
            FROM clients c
            LEFT JOIN customer_accounts a ON a.id = c.customer_account_id';
}

function clients_list(array $ctx): void
{
    $scope = company_scope($ctx, 'c');
    $stmt = db()->prepare(
        clients_select_sql() . " WHERE {$scope['sql']} ORDER BY c.created_at DESC"
    );
    $stmt->execute($scope['params']);
    json_response(array_map('client_out', $stmt->fetchAll()));
}

function clients_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'clients', $id);
    require_once __DIR__ . '/projects.php';

    $stmt = db()->prepare(clients_select_sql() . ' WHERE c.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Not found', 404);
    }

    $scope = company_scope($ctx, 'p');
    $projectsStmt = db()->prepare(
        projects_select_sql() . " WHERE p.client_id = ? AND {$scope['sql']} " . projects_list_order_sql()
    );
    $projectsStmt->execute([$id, ...$scope['params']]);

    $client = client_out($row);
    $client['projects'] = array_map('project_out', $projectsStmt->fetchAll());
    json_response($client);
}

function apply_client_type_rules(array $ctx, array $body, ?string $existingAccountId = null): array
{
    $clientType = normalize_client_type($body['client_type'] ?? 'b2c');
    $accountId = null;

    if ($clientType === 'b2b') {
        if (array_key_exists('customer_account_id', $body) || array_key_exists('new_account', $body)) {
            $accountId = resolve_customer_account_id($ctx, $body);
        } else {
            $accountId = $existingAccountId;
        }
        if (!$accountId) {
            json_error('B2B client requires a company — select one or add a new company', 422);
        }
    }

    return [$clientType, $accountId];
}

function clients_create(array $ctx): void
{
    $body = json_body();
    if (empty($body['name'])) {
        json_error('Contact name is required', 422);
    }

    [$clientType, $accountId] = apply_client_type_rules($ctx, $body);

    $companyId = insert_company_id($ctx);
    $id = uuid4();
    $cols = ['id', 'company_id', 'client_type', 'customer_account_id'];
    $vals = [$id, $companyId, $clientType, $accountId];

    foreach (CLIENT_FIELDS as $f) {
        if (in_array($f, ['client_type', 'customer_account_id'], true)) {
            continue;
        }
        if (array_key_exists($f, $body)) {
            $cols[] = $f;
            if ($f === 'tags') {
                $vals[] = json_encode($body[$f] ?? []);
            } else {
                $vals[] = $body[$f] === '' ? null : $body[$f];
            }
        }
    }

    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
    db()->prepare('INSERT INTO clients (' . implode(', ', $cols) . ") VALUES ($placeholders)")
        ->execute($vals);

    $stmt = db()->prepare(clients_select_sql() . ' WHERE c.id = ?');
    $stmt->execute([$id]);
    json_response(client_out($stmt->fetch()), 201);
}

function clients_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'clients', $id);

    $existing = db()->prepare('SELECT client_type, customer_account_id FROM clients WHERE id = ?');
    $existing->execute([$id]);
    $current = $existing->fetch();

    $body = json_body();
    $nextType = array_key_exists('client_type', $body)
        ? normalize_client_type($body['client_type'])
        : normalize_client_type($current['client_type']);

    $body['client_type'] = $nextType;
    [$clientType, $accountId] = apply_client_type_rules(
        $ctx,
        $body,
        $current['customer_account_id'] ?? null
    );

    $sets = ['client_type = ?', 'customer_account_id = ?'];
    $params = [$clientType, $accountId];

    foreach (CLIENT_FIELDS as $f) {
        if (in_array($f, ['client_type', 'customer_account_id'], true)) {
            continue;
        }
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            if ($f === 'tags') {
                $params[] = json_encode($body[$f] ?? []);
            } else {
                $params[] = $body[$f] === '' ? null : $body[$f];
            }
        }
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
