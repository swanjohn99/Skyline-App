<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/audit.php';

const CLOSED_STATUSES = ['completed', 'rejected'];
const PROJECT_STATUS_SORT_ORDER = [
    'site visit requested',
    'site visit done',
    'quotation sent',
    'advance received',
    'work started',
    'work completed',
    'completed',
    'rejected',
];
const PROJECT_FIELDS = [
    'client_id', 'lead_id', 'project_title', 'client_name', 'location', 'work_description',
    'total_quoted_amount', 'status', 'completion_percent',
    'start_date', 'end_date',
];

function projects_select_sql(): string
{
    return 'SELECT p.*,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE project_id = p.id) AS amount_received_computed,
            (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE project_id = p.id) AS total_expenses_computed
            FROM projects p';
}

function project_out(array $row): array
{
    if (isset($row['amount_received_computed'])) {
        $row['amount_received'] = (float) $row['amount_received_computed'];
        unset($row['amount_received_computed']);
    }
    if (isset($row['total_expenses_computed'])) {
        $row['total_expenses'] = (float) $row['total_expenses_computed'];
        unset($row['total_expenses_computed']);
    } else {
        $row['total_expenses'] = 0.0;
    }
    $received = (float) ($row['amount_received'] ?? 0);
    $row['profit'] = $received - $row['total_expenses'];
    return $row;
}

function route_projects(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
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
    if ($method === 'DELETE' && $id !== null) {
        projects_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function projects_list_order_sql(): string
{
    $quoted = array_map(fn ($s) => db()->quote($s), PROJECT_STATUS_SORT_ORDER);
    return 'ORDER BY FIELD(p.status, ' . implode(', ', $quoted) . '), p.created_at DESC';
}

function projects_list(array $ctx): void
{
    $scope = company_scope($ctx, 'p');
    $stmt = db()->prepare(
        projects_select_sql() . " WHERE {$scope['sql']} " . projects_list_order_sql()
    );
    $stmt->execute($scope['params']);
    json_response(array_map('project_out', $stmt->fetchAll()));
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
    $stmt = db()->prepare(projects_select_sql() . ' WHERE p.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Not found', 404);
    }
    json_response(project_out($row));
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

    $stmt = db()->prepare(projects_select_sql() . ' WHERE p.id = ?');
    $stmt->execute([$id]);
    json_response(project_out($stmt->fetch()), 201);
}

function projects_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'projects', $id);
    $before = db()->prepare('SELECT * FROM projects WHERE id = ?');
    $before->execute([$id]);
    $beforeRow = $before->fetch();
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
    $pdo = db();
    $pdo->prepare('UPDATE projects SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    $after = $pdo->prepare('SELECT * FROM projects WHERE id = ?');
    $after->execute([$id]);
    log_audit_action($pdo, $ctx, 'projects', $id, 'UPDATE', $beforeRow, $after->fetch());
    json_response(['ok' => true]);
}

function projects_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'projects', $id);
    db()->prepare('DELETE FROM projects WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
