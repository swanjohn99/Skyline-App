<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

const ACCOUNT_FIELDS = ['name', 'email', 'phone', 'address', 'location', 'notes'];

function account_out(array $row): array
{
    if (isset($row['contact_count'])) {
        $row['contact_count'] = (int) $row['contact_count'];
    }
    return $row;
}

function route_customer_accounts(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        if (isset($_GET['search'])) {
            accounts_search($ctx);
        }
        accounts_list($ctx);
    }
    if ($method === 'GET' && $id !== null) {
        accounts_get($ctx, $id);
    }
    if ($method === 'POST' && $id === null) {
        accounts_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        accounts_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        accounts_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function accounts_search(array $ctx): void
{
    $q = trim((string) ($_GET['search'] ?? ''));
    if (mb_strlen($q) < 2) {
        json_response([]);
    }
    $scope = company_scope($ctx, 'a');
    $stmt = db()->prepare(
        "SELECT a.id, a.name, a.phone, a.location
         FROM customer_accounts a
         WHERE {$scope['sql']} AND a.name LIKE ?
         ORDER BY a.name ASC LIMIT 20"
    );
    $stmt->execute([...$scope['params'], $q . '%']);
    json_response($stmt->fetchAll());
}

function accounts_list(array $ctx): void
{
    $scope = company_scope($ctx, 'a');
    $stmt = db()->prepare(
        "SELECT a.*,
                (SELECT COUNT(*) FROM clients c WHERE c.customer_account_id = a.id) AS contact_count
         FROM customer_accounts a
         WHERE {$scope['sql']}
         ORDER BY a.name ASC"
    );
    $stmt->execute($scope['params']);
    json_response(array_map('account_out', $stmt->fetchAll()));
}

function accounts_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'customer_accounts', $id);
    $stmt = db()->prepare('SELECT * FROM customer_accounts WHERE id = ?');
    $stmt->execute([$id]);
    $account = account_out($stmt->fetch());

    $contacts = db()->prepare(
        'SELECT id, name, contact_title, email, phone, client_type
         FROM clients WHERE customer_account_id = ? ORDER BY name ASC'
    );
    $contacts->execute([$id]);
    $account['contacts'] = $contacts->fetchAll();
    json_response($account);
}

function accounts_create(array $ctx): void
{
    $body = json_body();
    $id = account_insert($ctx, $body);
    $stmt = db()->prepare('SELECT * FROM customer_accounts WHERE id = ?');
    $stmt->execute([$id]);
    json_response(account_out($stmt->fetch()), 201);
}

function account_insert(array $ctx, array $body): string
{
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        json_error('Company name is required', 422);
    }

    $companyId = insert_company_id($ctx);
    $id = uuid4();
    $cols = ['id', 'company_id', 'name'];
    $vals = [$id, $companyId, $name];
    foreach (ACCOUNT_FIELDS as $f) {
        if ($f === 'name') {
            continue;
        }
        if (array_key_exists($f, $body)) {
            $cols[] = $f;
            $vals[] = $body[$f] === '' ? null : $body[$f];
        }
    }
    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
    db()->prepare('INSERT INTO customer_accounts (' . implode(', ', $cols) . ") VALUES ($placeholders)")
        ->execute($vals);
    return $id;
}

function accounts_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'customer_accounts', $id);
    $body = json_body();

    $sets = [];
    $params = [];
    foreach (ACCOUNT_FIELDS as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            $params[] = $body[$f] === '' ? null : $body[$f];
        }
    }
    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }
    $params[] = $id;
    db()->prepare('UPDATE customer_accounts SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function accounts_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'customer_accounts', $id);
    db()->prepare('DELETE FROM customer_accounts WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function resolve_customer_account_id(array $ctx, array $body): ?string
{
    $accountId = trim((string) ($body['customer_account_id'] ?? ''));
    if ($accountId !== '') {
        require_owned_row($ctx, 'customer_accounts', $accountId);
        return $accountId;
    }

    $newAccount = $body['new_account'] ?? null;
    if (is_array($newAccount) && trim((string) ($newAccount['name'] ?? '')) !== '') {
        return account_insert($ctx, $newAccount);
    }

    return null;
}
