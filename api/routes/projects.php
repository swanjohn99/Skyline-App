<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

const CLOSED_STATUSES = ['completed', 'rejected'];
const PROJECT_FIELDS = [
    'client_id', 'project_title', 'client_name', 'location', 'work_description',
    'total_quoted_amount', 'amount_received', 'status', 'completion_percent',
    'start_date', 'end_date',
];

function route_projects(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        // ?open=1 returns only projects that can still receive expenses/payments.
        if (isset($_GET['open'])) {
            projects_list_open($ctx);
        }
        projects_list($ctx);
    }
    if ($method === 'GET' && $id !== null) {
        projects_get($ctx, $id);
    }
    if ($method === 'POST' && $id === null) {
        projects_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        projects_update($ctx, $id);
    }
    json_error('Not found', 404);
}

function projects_list(array $ctx): void
{
    $scope = company_scope($ctx);
    $stmt = db()->prepare("SELECT * FROM projects WHERE {$scope['sql']} ORDER BY start_date DESC");
    $stmt->execute($scope['params']);
    json_response($stmt->fetchAll());
}

function projects_list_open(array $ctx): void
{
    $scope = company_scope($ctx);
    $placeholders = implode(', ', array_fill(0, count(CLOSED_STATUSES), '?'));
    $sql = "SELECT id, project_title, client_name, status FROM projects
            WHERE {$scope['sql']} AND status NOT IN ($placeholders)
            ORDER BY start_date DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute([...$scope['params'], ...CLOSED_STATUSES]);
    json_response($stmt->fetchAll());
}

function projects_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'projects', $id);
    $stmt = db()->prepare('SELECT * FROM projects WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch());
}

function projects_create(array $ctx): void
{
    $body = json_body();
    if (empty($body['project_title'])) {
        json_error('Project title is required', 422);
    }

    $companyId = insert_company_id($ctx);
    $id = uuid4();
    $cols = ['id', 'company_id'];
    $vals = [$id, $companyId];
    foreach (PROJECT_FIELDS as $f) {
        if (array_key_exists($f, $body)) {
            $cols[] = $f;
            $vals[] = $body[$f] === '' ? null : $body[$f];
        }
    }
    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
    db()->prepare('INSERT INTO projects (' . implode(', ', $cols) . ") VALUES ($placeholders)")
        ->execute($vals);

    $stmt = db()->prepare('SELECT * FROM projects WHERE id = ?');
    $stmt->execute([$id]);
    json_response($stmt->fetch(), 201);
}

function projects_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'projects', $id);
    $body = json_body();

    $sets = [];
    $params = [];
    foreach (PROJECT_FIELDS as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            $params[] = $body[$f] === '' ? null : $body[$f];
        }
    }
    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }
    $params[] = $id;
    db()->prepare('UPDATE projects SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}
