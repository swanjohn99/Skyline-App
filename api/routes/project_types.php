<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/entity.php';

const PROJECT_TYPE_CATEGORIES = ['Retrofitting', 'Waterproofing', 'NDT Testing'];

function normalize_project_category(?string $category): string
{
    $value = trim((string) ($category ?? ''));
    if (!in_array($value, PROJECT_TYPE_CATEGORIES, true)) {
        json_error('Invalid project type category', 422);
    }
    return $value;
}

function route_project_types(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        project_types_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        if (!$ctx['is_super_admin'] && !($ctx['is_owner'] ?? false)) {
            json_error('Only owners can manage the catalog', 403);
        }
        project_types_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        if (!$ctx['is_super_admin'] && !($ctx['is_owner'] ?? false)) {
            json_error('Only owners can manage the catalog', 403);
        }
        project_types_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        if (!$ctx['is_super_admin'] && !($ctx['is_owner'] ?? false)) {
            json_error('Only owners can manage the catalog', 403);
        }
        project_types_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function project_types_list(array $ctx): void
{
    $scope = company_scope($ctx, 'pt');
    $activeOnly = isset($_GET['active']) && $_GET['active'] !== '0';
    $sql = "SELECT * FROM project_types pt WHERE {$scope['sql']}";
    if ($activeOnly) {
        $sql .= ' AND pt.is_active = 1';
    }
    $sql .= ' ORDER BY pt.category ASC, pt.name ASC';
    $stmt = db()->prepare($sql);
    $stmt->execute($scope['params']);
    json_response($stmt->fetchAll());
}

function project_types_create(array $ctx): void
{
    $body = json_body();
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        json_error('Name is required', 422);
    }
    $category = normalize_project_category($body['category'] ?? '');
    $companyId = insert_company_id($ctx);
    $id = uuid4();
    db()->prepare(
        'INSERT INTO project_types (id, company_id, category, name, is_active) VALUES (?, ?, ?, ?, ?)'
    )->execute([$id, $companyId, $category, $name, array_key_exists('is_active', $body) ? ($body['is_active'] ? 1 : 0) : 1]);
    json_response(['id' => $id], 201);
}

function project_types_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'project_types', $id);
    $body = json_body();
    $sets = [];
    $params = [];
    if (array_key_exists('name', $body)) {
        $sets[] = 'name = ?';
        $params[] = trim((string) $body['name']);
    }
    if (array_key_exists('category', $body)) {
        $sets[] = 'category = ?';
        $params[] = normalize_project_category($body['category']);
    }
    if (array_key_exists('is_active', $body)) {
        $sets[] = 'is_active = ?';
        $params[] = $body['is_active'] ? 1 : 0;
    }
    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }
    $params[] = $id;
    db()->prepare('UPDATE project_types SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function project_types_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'project_types', $id);
    db()->prepare('UPDATE project_types SET is_active = 0 WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_entity_project_types(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'DELETE'], true);
    $ctx = data_context($write);

    if ($method === 'GET') {
        if (!isset($_GET['entity_type'], $_GET['entity_id'])) {
            json_error('entity_type and entity_id are required', 422);
        }
        entity_project_types_list($ctx, normalize_entity_type($_GET['entity_type']), (string) $_GET['entity_id']);
    }
    if ($method === 'POST') {
        entity_project_types_set($ctx);
    }
    if ($method === 'DELETE' && isset($segments[0])) {
        entity_project_types_remove($ctx, $segments[0]);
    }
    json_error('Not found', 404);
}

function entity_project_types_list(array $ctx, string $entityType, string $entityId): void
{
    validate_entity_ref($ctx, $entityType, $entityId);
    $stmt = db()->prepare(
        'SELECT ept.id, ept.project_type_id, pt.category, pt.name
         FROM entity_project_types ept
         INNER JOIN project_types pt ON pt.id = ept.project_type_id
         WHERE ept.entity_type = ? AND ept.entity_id = ?
         ORDER BY pt.category, pt.name'
    );
    $stmt->execute([$entityType, $entityId]);
    json_response($stmt->fetchAll());
}

function entity_project_types_set(array $ctx): void
{
    $body = json_body();
    $entityType = normalize_entity_type($body['entity_type'] ?? '');
    $entityId = trim((string) ($body['entity_id'] ?? ''));
    $typeIds = $body['project_type_ids'] ?? [];
    if ($entityId === '' || !is_array($typeIds)) {
        json_error('entity_id and project_type_ids array are required', 422);
    }
    validate_entity_ref($ctx, $entityType, $entityId);
    $companyId = row_company_id(entity_table($entityType), $entityId);

    $pdo = db();
    $pdo->prepare(
        'DELETE FROM entity_project_types WHERE company_id = ? AND entity_type = ? AND entity_id = ?'
    )->execute([$companyId, $entityType, $entityId]);

    foreach ($typeIds as $typeId) {
        require_owned_row($ctx, 'project_types', (string) $typeId);
        $pdo->prepare(
            'INSERT INTO entity_project_types (id, company_id, entity_type, entity_id, project_type_id)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([uuid4(), $companyId, $entityType, $entityId, $typeId]);
    }
    json_response(['ok' => true]);
}

function entity_project_types_remove(array $ctx, string $id): void
{
    require_owned_row($ctx, 'entity_project_types', $id);
    db()->prepare('DELETE FROM entity_project_types WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
