<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/audit.php';

function route_audit_logs(string $method, array $segments): void
{
    $ctx = data_context(false);
    require_audit_reader($ctx);

    if ($method === 'GET' && empty($segments[0])) {
        audit_logs_list($ctx);
    }
    json_error('Not found', 404);
}

function audit_logs_list(array $ctx): void
{
    $scope = company_scope($ctx, 'a');
    $sql = "SELECT a.id, a.user_id, a.table_name, a.record_id, a.action, a.details, a.created_at,
                   u.email AS user_email
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE {$scope['sql']}";
    $params = $scope['params'];

    if (!empty($_GET['table_name'])) {
        $sql .= ' AND a.table_name = ?';
        $params[] = $_GET['table_name'];
    }
    if (!empty($_GET['record_id'])) {
        $sql .= ' AND a.record_id = ?';
        $params[] = $_GET['record_id'];
    }

    $limit = min(200, max(1, (int) ($_GET['limit'] ?? 50)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));
    $sql .= ' ORDER BY a.created_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;

    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        if ($row['details']) {
            $row['details'] = json_decode($row['details'], true);
        }
    }
    json_response($rows);
}
