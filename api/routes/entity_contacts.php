<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/entity.php';

function route_entity_contacts(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        if (!isset($_GET['entity_type'], $_GET['entity_id'])) {
            json_error('entity_type and entity_id are required', 422);
        }
        entity_contacts_list($ctx, normalize_entity_type($_GET['entity_type']), (string) $_GET['entity_id']);
    }
    if ($method === 'POST' && $id === null) {
        entity_contacts_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        entity_contacts_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        entity_contacts_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function entity_contacts_list(array $ctx, string $entityType, string $entityId): void
{
    validate_entity_ref($ctx, $entityType, $entityId);
    $stmt = db()->prepare(
        'SELECT ec.*, c.name AS client_name, c.phone, c.email
         FROM entity_contacts ec
         INNER JOIN clients c ON c.id = ec.client_id
         WHERE ec.entity_type = ? AND ec.entity_id = ?
         ORDER BY ec.is_principal DESC, c.name ASC'
    );
    $stmt->execute([$entityType, $entityId]);
    json_response($stmt->fetchAll());
}

function entity_contacts_create(array $ctx): void
{
    $body = json_body();
    $entityType = normalize_entity_type($body['entity_type'] ?? '');
    $entityId = trim((string) ($body['entity_id'] ?? ''));
    $clientId = trim((string) ($body['client_id'] ?? ''));
    if ($entityId === '' || $clientId === '') {
        json_error('entity_id and client_id are required', 422);
    }
    validate_entity_ref($ctx, $entityType, $entityId);
    require_owned_row($ctx, 'clients', $clientId);
    if ($entityType === 'client' && $clientId === $entityId) {
        json_error('A client cannot be linked as its own point of contact', 422);
    }

    $companyId = row_company_id(entity_table($entityType), $entityId);
    $isPrincipal = !empty($body['is_principal']);

    $pdo = db();
    if ($isPrincipal) {
        $pdo->prepare(
            'UPDATE entity_contacts SET is_principal = 0 WHERE company_id = ? AND entity_type = ? AND entity_id = ?'
        )->execute([$companyId, $entityType, $entityId]);
    }

    $id = uuid4();
    $pdo->prepare(
        'INSERT INTO entity_contacts (id, company_id, entity_type, entity_id, client_id, is_principal, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $entityType,
        $entityId,
        $clientId,
        $isPrincipal ? 1 : 0,
        trim((string) ($body['role'] ?? '')) ?: null,
    ]);
    json_response(['id' => $id], 201);
}

function entity_contacts_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'entity_contacts', $id);
    $body = json_body();
    $row = db()->prepare('SELECT * FROM entity_contacts WHERE id = ?');
    $row->execute([$id]);
    $current = $row->fetch();

    if (!empty($body['is_principal'])) {
        db()->prepare(
            'UPDATE entity_contacts SET is_principal = 0 WHERE company_id = ? AND entity_type = ? AND entity_id = ?'
        )->execute([$current['company_id'], $current['entity_type'], $current['entity_id']]);
    }

    $sets = [];
    $params = [];
    if (array_key_exists('is_principal', $body)) {
        $sets[] = 'is_principal = ?';
        $params[] = $body['is_principal'] ? 1 : 0;
    }
    if (array_key_exists('role', $body)) {
        $sets[] = 'role = ?';
        $params[] = $body['role'] === '' ? null : $body['role'];
    }
    if (array_key_exists('client_id', $body)) {
        require_owned_row($ctx, 'clients', (string) $body['client_id']);
        $sets[] = 'client_id = ?';
        $params[] = $body['client_id'];
    }
    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }
    $params[] = $id;
    db()->prepare('UPDATE entity_contacts SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function entity_contacts_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'entity_contacts', $id);
    db()->prepare('DELETE FROM entity_contacts WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
