<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';

function route_milestones(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        if (isset($_GET['project_id'])) {
            milestones_by_project($ctx, (string) $_GET['project_id']);
        }
        milestones_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        milestones_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        milestones_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        milestones_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function milestones_list(array $ctx): void
{
    $scope = company_scope($ctx, 'm');
    $sql = "SELECT m.id, m.project_id, m.title, m.milestone_date, m.comments, m.created_at,
                   p.project_title, p.client_name
            FROM milestones m
            LEFT JOIN projects p ON p.id = m.project_id
            WHERE {$scope['sql']}
            ORDER BY m.milestone_date DESC, m.created_at DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($scope['params']);
    json_response(array_map('milestone_out', $stmt->fetchAll()));
}

function milestones_by_project(array $ctx, string $projectId): void
{
    require_owned_row($ctx, 'projects', $projectId);
    $stmt = db()->prepare(
        'SELECT * FROM milestones WHERE project_id = ? ORDER BY milestone_date DESC, created_at DESC'
    );
    $stmt->execute([$projectId]);
    json_response($stmt->fetchAll());
}

function milestones_create(array $ctx): void
{
    $fields = require_fields(['project_id', 'title', 'milestone_date']);
    require_owned_row($ctx, 'projects', (string) $fields['project_id']);
    $companyId = row_company_id('projects', (string) $fields['project_id']);

    $id = uuid4();
    db()->prepare(
        'INSERT INTO milestones (id, company_id, project_id, title, milestone_date, comments)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $fields['project_id'],
        trim((string) $fields['title']),
        $fields['milestone_date'],
        body_field('comments') ?: null,
    ]);
    json_response(['id' => $id], 201);
}

function milestones_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'milestones', $id);
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
    if (array_key_exists('title', $body)) {
        $title = trim((string) $body['title']);
        if ($title === '') {
            json_error('Title is required', 422);
        }
        $sets[] = 'title = ?';
        $params[] = $title;
    }
    if (array_key_exists('milestone_date', $body)) {
        $sets[] = 'milestone_date = ?';
        $params[] = $body['milestone_date'];
    }
    if (array_key_exists('comments', $body)) {
        $sets[] = 'comments = ?';
        $params[] = $body['comments'] === '' ? null : $body['comments'];
    }

    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }

    $params[] = $id;
    db()->prepare('UPDATE milestones SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function milestones_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'milestones', $id);
    db()->prepare('DELETE FROM milestones WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function milestone_out(array $row): array
{
    $row['projects'] = [
        'project_title' => $row['project_title'],
        'client_name'   => $row['client_name'],
    ];
    unset($row['project_title'], $row['client_name']);
    return $row;
}
