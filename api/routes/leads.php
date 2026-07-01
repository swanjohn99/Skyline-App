<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/entity.php';
require_once __DIR__ . '/../lib/audit.php';
require_once __DIR__ . '/clients.php';

const LEAD_STATUSES = [
    'new_inquiry', 'photos_received', 'site_visit_scheduled',
    'quotation_pending', 'quotation_sent', 'converted', 'lost',
];
const LEAD_FIELDS = [
    'client_id', 'contact_name', 'project_title', 'phone', 'email', 'location',
    'source', 'status', 'estimated_value', 'notes',
];

function normalize_lead_status(?string $status): string
{
    $value = trim((string) ($status ?? 'new_inquiry'));
    if (!in_array($value, LEAD_STATUSES, true)) {
        json_error('Invalid lead status', 422);
    }
    return $value;
}

function leads_select_sql(): string
{
    return 'SELECT l.*,
                   c.name AS client_name_joined,
                   c.phone AS client_phone_joined,
                   c.email AS client_email_joined,
                   c.location AS client_location_joined
            FROM leads l
            LEFT JOIN clients c ON c.id = l.client_id';
}

function lead_display_name(array $row): string
{
    if (!empty($row['contact_name'])) {
        return (string) $row['contact_name'];
    }
    return (string) ($row['client_name_joined'] ?? 'Lead');
}

function lead_out(array $row): array
{
    $row['display_name'] = lead_display_name($row);
    if ($row['client_id']) {
        $row['client'] = [
            'id'       => $row['client_id'],
            'name'     => $row['client_name_joined'],
            'phone'    => $row['client_phone_joined'],
            'email'    => $row['client_email_joined'],
            'location' => $row['client_location_joined'],
        ];
    } else {
        $row['client'] = null;
    }
    unset(
        $row['client_name_joined'],
        $row['client_phone_joined'],
        $row['client_email_joined'],
        $row['client_location_joined']
    );
    return $row;
}

function resolve_lead_client_id(array $ctx, array $body, ?string $existingClientId = null): string
{
    $clientId = trim((string) ($body['client_id'] ?? $existingClientId ?? ''));
    if ($clientId !== '') {
        require_owned_row($ctx, 'clients', $clientId);
        return $clientId;
    }

    $name = trim((string) ($body['contact_name'] ?? ''));
    if ($name === '') {
        json_error('Select an existing client or enter a contact name', 422);
    }
    $phone = trim((string) ($body['phone'] ?? ''));
    $email = trim((string) ($body['email'] ?? ''));
    if ($phone === '' && $email === '') {
        json_error('Enter a phone or email for new inquiries', 422);
    }

    $companyId = insert_company_id($ctx);
    $pdo = db();

    if ($phone !== '') {
        $stmt = $pdo->prepare('SELECT id FROM clients WHERE company_id = ? AND phone = ? LIMIT 1');
        $stmt->execute([$companyId, $phone]);
        $found = $stmt->fetch();
        if ($found) {
            return $found['id'];
        }
    }
    if ($email !== '') {
        $stmt = $pdo->prepare('SELECT id FROM clients WHERE company_id = ? AND email = ? LIMIT 1');
        $stmt->execute([$companyId, $email]);
        $found = $stmt->fetch();
        if ($found) {
            return $found['id'];
        }
    }

    $id = uuid4();
    $pdo->prepare(
        'INSERT INTO clients (id, company_id, client_type, name, phone, email, location, source)
         VALUES (?, ?, \'b2c\', ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $name,
        $phone ?: null,
        $email ?: null,
        trim((string) ($body['location'] ?? '')) ?: null,
        trim((string) ($body['source'] ?? '')) ?: null,
    ]);
    return $id;
}

function route_leads(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;
    $action = $segments[1] ?? null;

    if ($method === 'GET' && $id === 'funnel') {
        leads_funnel($ctx);
    }
    if ($method === 'GET' && $id === null) {
        leads_list($ctx);
    }
    if ($method === 'GET' && $id !== null && $id !== 'funnel') {
        leads_get($ctx, $id);
    }
    if ($method === 'POST' && $id === null) {
        leads_create($ctx);
    }
    if ($method === 'POST' && $id !== null && $action === 'convert') {
        leads_convert($ctx, $id);
    }
    if ($method === 'PATCH' && $id !== null) {
        leads_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        leads_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function leads_list(array $ctx): void
{
    $scope = company_scope($ctx, 'l');
    $stmt = db()->prepare(
        leads_select_sql() . " WHERE {$scope['sql']} ORDER BY l.updated_at DESC, l.created_at DESC"
    );
    $stmt->execute($scope['params']);
    json_response(array_map('lead_out', $stmt->fetchAll()));
}

function leads_funnel(array $ctx): void
{
    $scope = company_scope($ctx, 'l');
    $stmt = db()->prepare(
        "SELECT status, COUNT(*) AS cnt FROM leads l WHERE {$scope['sql']} GROUP BY status"
    );
    $stmt->execute($scope['params']);
    $counts = [];
    foreach (LEAD_STATUSES as $s) {
        $counts[$s] = 0;
    }
    foreach ($stmt->fetchAll() as $row) {
        $counts[$row['status']] = (int) $row['cnt'];
    }
    json_response($counts);
}

function leads_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'leads', $id);
    $stmt = db()->prepare(leads_select_sql() . ' WHERE l.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Not found', 404);
    }
    json_response(lead_out($row));
}

function leads_create(array $ctx): void
{
    $body = json_body();
    $clientId = resolve_lead_client_id($ctx, $body);
    $companyId = insert_company_id($ctx);
    $status = normalize_lead_status($body['status'] ?? 'new_inquiry');
    if ($status === 'converted') {
        json_error('Cannot create a lead as converted', 422);
    }

    $id = uuid4();
    db()->prepare(
        'INSERT INTO leads (id, company_id, client_id, contact_name, project_title, phone, email, location, source, status, estimated_value, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $clientId,
        trim((string) ($body['contact_name'] ?? '')) ?: null,
        trim((string) ($body['project_title'] ?? '')) ?: null,
        trim((string) ($body['phone'] ?? '')) ?: null,
        trim((string) ($body['email'] ?? '')) ?: null,
        trim((string) ($body['location'] ?? '')) ?: null,
        trim((string) ($body['source'] ?? '')) ?: null,
        $status,
        $body['estimated_value'] ?? null,
        $body['notes'] ?? null,
    ]);

    $pdo = db();
    log_audit_action($pdo, $ctx, 'leads', $id, 'INSERT', null, ['id' => $id, 'status' => $status]);

    $stmt = db()->prepare(leads_select_sql() . ' WHERE l.id = ?');
    $stmt->execute([$id]);
    json_response(lead_out($stmt->fetch()), 201);
}

function leads_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'leads', $id);
    $beforeStmt = db()->prepare('SELECT * FROM leads WHERE id = ?');
    $beforeStmt->execute([$id]);
    $before = $beforeStmt->fetch();

    $body = json_body();
    $clientId = array_key_exists('client_id', $body) || array_key_exists('contact_name', $body)
        ? resolve_lead_client_id($ctx, $body, $before['client_id'])
        : $before['client_id'];

    $sets = ['client_id = ?'];
    $params = [$clientId];

    foreach (LEAD_FIELDS as $f) {
        if ($f === 'client_id') {
            continue;
        }
        if (array_key_exists($f, $body)) {
            if ($f === 'status') {
                if ($before['status'] === 'converted') {
                    continue;
                }
                $sets[] = 'status = ?';
                $params[] = normalize_lead_status($body['status']);
            } else {
                $sets[] = "$f = ?";
                $val = $body[$f];
                $params[] = ($val === '' || $val === null) ? null : $val;
            }
        }
    }

    $params[] = $id;
    db()->prepare('UPDATE leads SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

    $afterStmt = db()->prepare('SELECT * FROM leads WHERE id = ?');
    $afterStmt->execute([$id]);
    $after = $afterStmt->fetch();
    log_audit_action(db(), $ctx, 'leads', $id, 'UPDATE', $before, $after);

    json_response(['ok' => true]);
}

function leads_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'leads', $id);
    $beforeStmt = db()->prepare('SELECT * FROM leads WHERE id = ?');
    $beforeStmt->execute([$id]);
    $before = $beforeStmt->fetch();
    db()->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
    log_audit_action(db(), $ctx, 'leads', $id, 'DELETE', $before, null);
    json_response(['ok' => true]);
}

function leads_convert(array $ctx, string $id): void
{
    require_owned_row($ctx, 'leads', $id);
    require_once __DIR__ . '/projects.php';

    $stmt = db()->prepare(leads_select_sql() . ' WHERE l.id = ?');
    $stmt->execute([$id]);
    $lead = $stmt->fetch();
    if (!$lead) {
        json_error('Not found', 404);
    }
    if ($lead['status'] === 'converted') {
        json_error('Lead already converted', 409);
    }
    if ($lead['status'] === 'lost') {
        json_error('Lost leads cannot be converted', 422);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $clientId = $lead['client_id'];
        if (!$clientId) {
            $clientId = resolve_lead_client_id($ctx, $lead);
            $pdo->prepare('UPDATE leads SET client_id = ? WHERE id = ?')->execute([$clientId, $id]);
        }

        $clientStmt = $pdo->prepare('SELECT name FROM clients WHERE id = ?');
        $clientStmt->execute([$clientId]);
        $clientRow = $clientStmt->fetch();

        $projectId = uuid4();
        $title = trim((string) ($lead['project_title'] ?? ''));
        if ($title === '') {
            $title = lead_display_name($lead) . ' — Project';
        }
        $projectStatus = lead_status_to_project_status($lead['status']);

        $pdo->prepare(
            'INSERT INTO projects (id, company_id, client_id, lead_id, project_title, client_name, location, work_description, total_quoted_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $projectId,
            $lead['company_id'],
            $clientId,
            $id,
            $title,
            $clientRow['name'] ?? lead_display_name($lead),
            $lead['location'],
            $lead['notes'],
            $lead['estimated_value'],
            $projectStatus,
        ]);

        move_entity_children($pdo, $lead['company_id'], 'lead', $id, 'project', $projectId);

        $pocCount = $pdo->prepare(
            'SELECT COUNT(*) FROM entity_contacts WHERE company_id = ? AND entity_type = ? AND entity_id = ?'
        );
        $pocCount->execute([$lead['company_id'], 'project', $projectId]);
        if ((int) $pocCount->fetchColumn() === 0) {
            $pocId = uuid4();
            $pdo->prepare(
                'INSERT INTO entity_contacts (id, company_id, entity_type, entity_id, client_id, is_principal, role)
                 VALUES (?, ?, \'project\', ?, ?, 1, ?)'
            )->execute([$pocId, $lead['company_id'], $projectId, $clientId, 'Owner']);
        }

        $pdo->prepare(
            'UPDATE leads SET status = \'converted\', converted_project_id = ? WHERE id = ?'
        )->execute([$projectId, $id]);

        log_audit_action($pdo, $ctx, 'leads', $id, 'UPDATE', $lead, ['status' => 'converted', 'project_id' => $projectId]);
        log_audit_action($pdo, $ctx, 'projects', $projectId, 'INSERT', null, ['lead_id' => $id]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    json_response(['project_id' => $projectId], 201);
}
