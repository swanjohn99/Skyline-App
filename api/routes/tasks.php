<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/entity.php';

const TASK_TYPES = ['site_visit', 'payment_followup', 'client_call'];

function normalize_task_type(?string $type): string
{
    $value = trim((string) ($type ?? 'client_call'));
    if (!in_array($value, TASK_TYPES, true)) {
        json_error('Invalid task type', 422);
    }
    return $value;
}

function route_tasks(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        tasks_list($ctx);
    }
    if ($method === 'GET' && $id !== null) {
        tasks_get($ctx, $id);
    }
    if ($method === 'POST' && $id === null) {
        tasks_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        tasks_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        tasks_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function tasks_list(array $ctx): void
{
    $scope = company_scope($ctx, 't');
    $sql = "SELECT * FROM tasks t WHERE {$scope['sql']}";
    $params = $scope['params'];

    if (!empty($_GET['from'])) {
        $sql .= ' AND t.due_date >= ?';
        $params[] = $_GET['from'];
    }
    if (!empty($_GET['to'])) {
        $sql .= ' AND t.due_date <= ?';
        $params[] = $_GET['to'];
    }
    if (isset($_GET['completed'])) {
        $sql .= ' AND t.is_completed = ?';
        $params[] = $_GET['completed'] === '1' || $_GET['completed'] === 'true' ? 1 : 0;
    }
    if (!empty($_GET['entity_type']) && !empty($_GET['entity_id'])) {
        $sql .= ' AND t.entity_type = ? AND t.entity_id = ?';
        $params[] = normalize_entity_type($_GET['entity_type']);
        $params[] = $_GET['entity_id'];
    }

    $sql .= ' ORDER BY t.due_date ASC, t.created_at ASC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

function tasks_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'tasks', $id);
    $stmt = db()->prepare('SELECT * FROM tasks WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch());
}

function tasks_create(array $ctx): void
{
    $body = json_body();
    $title = trim((string) ($body['title'] ?? ''));
    if ($title === '') {
        json_error('Title is required', 422);
    }
    $fields = require_fields(['due_date']);
    $entityType = $body['entity_type'] ?? null;
    $entityId = $body['entity_id'] ?? null;
    if ($entityType && $entityId) {
        validate_entity_ref($ctx, normalize_entity_type($entityType), (string) $entityId);
    }

    $companyId = insert_company_id($ctx);
    $id = uuid4();
    db()->prepare(
        'INSERT INTO tasks (id, company_id, entity_type, entity_id, title, task_type, due_date, is_completed, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
    )->execute([
        $id,
        $companyId,
        $entityType ? normalize_entity_type($entityType) : null,
        $entityId ?: null,
        $title,
        normalize_task_type($body['task_type'] ?? null),
        $fields['due_date'],
        $body['notes'] ?? null,
    ]);
    json_response(['id' => $id], 201);
}

function tasks_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'tasks', $id);
    $body = json_body();
    $sets = [];
    $params = [];

    foreach (['title', 'due_date', 'notes'] as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            $params[] = $body[$f] === '' ? null : $body[$f];
        }
    }
    if (array_key_exists('task_type', $body)) {
        $sets[] = 'task_type = ?';
        $params[] = normalize_task_type($body['task_type']);
    }
    if (array_key_exists('is_completed', $body)) {
        $sets[] = 'is_completed = ?';
        $params[] = $body['is_completed'] ? 1 : 0;
    }
    if (array_key_exists('entity_type', $body) || array_key_exists('entity_id', $body)) {
        $et = $body['entity_type'] ?? null;
        $eid = $body['entity_id'] ?? null;
        if ($et && $eid) {
            validate_entity_ref($ctx, normalize_entity_type($et), (string) $eid);
        }
        $sets[] = 'entity_type = ?';
        $sets[] = 'entity_id = ?';
        $params[] = $et ? normalize_entity_type($et) : null;
        $params[] = $eid ?: null;
    }
    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }
    $params[] = $id;
    db()->prepare('UPDATE tasks SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function tasks_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'tasks', $id);
    db()->prepare('DELETE FROM tasks WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function warranty_end_date(string $startDate, int $durationMonths): string
{
    $dt = new DateTimeImmutable($startDate);
    return $dt->modify("+{$durationMonths} months")->format('Y-m-d');
}

function route_warranties(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        warranties_list($ctx);
    }
    if ($method === 'GET' && $id !== null) {
        warranties_get($ctx, $id);
    }
    if ($method === 'POST' && $id === null) {
        warranties_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        warranties_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        warranties_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function warranties_list(array $ctx): void
{
    $scope = company_scope($ctx, 'w');
    $sql = "SELECT w.*, p.project_title FROM warranties w
            INNER JOIN projects p ON p.id = w.project_id
            WHERE {$scope['sql']}";
    $params = $scope['params'];
    if (!empty($_GET['project_id'])) {
        $sql .= ' AND w.project_id = ?';
        $params[] = $_GET['project_id'];
    }
    $sql .= ' ORDER BY w.end_date DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

function warranties_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'warranties', $id);
    $stmt = db()->prepare('SELECT * FROM warranties WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch());
}

function warranties_create(array $ctx): void
{
    $body = json_body();
    $fields = require_fields(['project_id', 'start_date', 'duration_months']);
    require_owned_row($ctx, 'projects', (string) $fields['project_id']);
    $duration = (int) $fields['duration_months'];
    if ($duration < 1) {
        json_error('duration_months must be at least 1', 422);
    }
    $endDate = warranty_end_date((string) $fields['start_date'], $duration);
    $companyId = row_company_id('projects', (string) $fields['project_id']);
    $id = uuid4();
    db()->prepare(
        'INSERT INTO warranties (id, company_id, project_id, start_date, duration_months, end_date, terms, document_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id, $companyId, $fields['project_id'],
        $fields['start_date'], $duration, $endDate,
        $body['terms'] ?? null,
        $body['document_path'] ?? null,
    ]);
    json_response(['id' => $id, 'end_date' => $endDate], 201);
}

function warranties_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'warranties', $id);
    $body = json_body();
    $current = db()->prepare('SELECT * FROM warranties WHERE id = ?');
    $current->execute([$id]);
    $row = $current->fetch();

    $start = $body['start_date'] ?? $row['start_date'];
    $duration = array_key_exists('duration_months', $body)
        ? (int) $body['duration_months']
        : (int) $row['duration_months'];
    $endDate = warranty_end_date((string) $start, $duration);

    $sets = ['start_date = ?', 'duration_months = ?', 'end_date = ?'];
    $params = [$start, $duration, $endDate];
    foreach (['terms', 'document_path'] as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            $params[] = $body[$f] === '' ? null : $body[$f];
        }
    }
    $params[] = $id;
    db()->prepare('UPDATE warranties SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true, 'end_date' => $endDate]);
}

function warranties_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'warranties', $id);
    db()->prepare('DELETE FROM warranties WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
