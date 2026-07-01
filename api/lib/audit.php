<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session.php';

const AUDIT_ACTIONS = ['INSERT', 'UPDATE', 'DELETE'];

function log_audit_action(
    PDO $pdo,
    array $ctx,
    string $table,
    string $recordId,
    string $action,
    ?array $before = null,
    ?array $after = null
): void {
    if (!in_array($action, AUDIT_ACTIONS, true)) {
        return;
    }
    $userId = $ctx['user']['id'] ?? null;
    if (!$userId) {
        return;
    }
    $companyId = $ctx['company_id'] ?? insert_company_id($ctx);
    if (!$companyId) {
        return;
    }
    $details = null;
    if ($before !== null || $after !== null) {
        $details = json_encode(['before' => $before, 'after' => $after], JSON_UNESCAPED_UNICODE);
    }
    $pdo->prepare(
        'INSERT INTO audit_logs (id, company_id, user_id, table_name, record_id, action, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([uuid4(), $companyId, $userId, $table, $recordId, $action, $details]);
}

function require_audit_reader(array $ctx): void
{
    if ($ctx['is_super_admin'] || ($ctx['is_owner'] ?? false)) {
        return;
    }
    json_error('Not allowed', 403);
}
