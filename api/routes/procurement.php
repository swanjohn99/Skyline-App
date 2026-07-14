<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/audit.php';
require_once __DIR__ . '/../lib/vendor_pricing.php';

const VENDOR_CONTACT_TAGS = ['owner', 'contact_person', 'other'];

function normalize_vendor_contact_tag(?string $tag): string
{
    $value = trim((string) ($tag ?? 'contact_person'));
    if (!in_array($value, VENDOR_CONTACT_TAGS, true)) {
        json_error('Contact tag must be owner, contact_person, or other', 422);
    }
    return $value;
}

function parse_vendor_contacts(array $contacts): array
{
    if (!is_array($contacts)) {
        json_error('contacts must be an array', 422);
    }

    $parsed = [];
    $sort = 0;

    foreach ($contacts as $contact) {
        if (!is_array($contact)) {
            json_error('Invalid vendor contact', 422);
        }

        $name = trim((string) ($contact['name'] ?? ''));
        if ($name === '') {
            continue;
        }

        $tag = normalize_vendor_contact_tag($contact['tag'] ?? null);
        $tagLabel = trim((string) ($contact['tag_label'] ?? '')) ?: null;

        if ($tag === 'other' && ($tagLabel === null || $tagLabel === '')) {
            json_error('Tag label is required when tag is other', 422);
        }
        if ($tag !== 'other') {
            $tagLabel = null;
        }

        $parsed[] = [
            'name'       => $name,
            'phone'      => trim((string) ($contact['phone'] ?? '')) ?: null,
            'email'      => trim((string) ($contact['email'] ?? '')) ?: null,
            'tag'        => $tag,
            'tag_label'  => $tagLabel,
            'sort_order' => $sort++,
        ];
    }

    return $parsed;
}

function load_vendor_contacts(string $vendorId): array
{
    $stmt = db()->prepare(
        'SELECT * FROM vendor_contacts WHERE vendor_id = ? ORDER BY sort_order ASC, created_at ASC'
    );
    $stmt->execute([$vendorId]);
    return $stmt->fetchAll();
}

function insert_vendor_contacts(PDO $pdo, string $companyId, string $vendorId, array $contacts): void
{
    if (empty($contacts)) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO vendor_contacts (id, company_id, vendor_id, name, phone, email, tag, tag_label, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    foreach ($contacts as $contact) {
        $stmt->execute([
            uuid4(),
            $companyId,
            $vendorId,
            $contact['name'],
            $contact['phone'],
            $contact['email'],
            $contact['tag'],
            $contact['tag_label'],
            $contact['sort_order'],
        ]);
    }
}

function replace_vendor_contacts(PDO $pdo, string $companyId, string $vendorId, array $contacts): void
{
    $pdo->prepare('DELETE FROM vendor_contacts WHERE vendor_id = ?')->execute([$vendorId]);
    insert_vendor_contacts($pdo, $companyId, $vendorId, $contacts);
}

function vendor_out(array $row): array
{
    $row['contacts'] = load_vendor_contacts($row['id']);
    return $row;
}

function normalize_vendor_website(mixed $value): ?string
{
    $website = trim((string) ($value ?? ''));
    if ($website === '') {
        return null;
    }
    if (strlen($website) > 512) {
        json_error('Website URL is too long', 422);
    }
    return $website;
}

function normalize_vendor_email(mixed $value): ?string
{
    $email = trim((string) ($value ?? ''));
    if ($email === '') {
        return null;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Invalid company email address', 422);
    }
    return $email;
}

function normalize_vendor_ifsc(mixed $value): ?string
{
    $ifsc = strtoupper(trim((string) ($value ?? '')));
    if ($ifsc === '') {
        return null;
    }
    if (!preg_match('/^[A-Z]{4}0[A-Z0-9]{6}$/', $ifsc)) {
        json_error('Invalid IFSC code format', 422);
    }
    return $ifsc;
}

function nullable_vendor_text(mixed $value): ?string
{
    $text = trim((string) ($value ?? ''));
    return $text === '' ? null : $text;
}

function route_vendors(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        vendors_list($ctx);
    }
    if ($method === 'GET' && $id !== null) {
        vendors_get($ctx, $id);
    }
    if ($method === 'POST' && $id === null) {
        vendors_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        vendors_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        vendors_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function vendors_list(array $ctx): void
{
    $scope = company_scope($ctx, 'v');
    $stmt = db()->prepare("SELECT * FROM vendors v WHERE {$scope['sql']} ORDER BY v.name ASC");
    $stmt->execute($scope['params']);
    json_response(array_map('vendor_out', $stmt->fetchAll()));
}

function vendors_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'vendors', $id);
    $stmt = db()->prepare('SELECT * FROM vendors WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Not found', 404);
    }
    json_response(vendor_out($row));
}

function vendors_create(array $ctx): void
{
    $body = json_body();
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        json_error('Vendor name is required', 422);
    }
    $companyId = insert_company_id($ctx);
    $id = uuid4();
    $contacts = array_key_exists('contacts', $body) ? parse_vendor_contacts($body['contacts']) : [];

    $pdo = db();
    $pdo->prepare(
        'INSERT INTO vendors (id, company_id, name, phone, email, gst_number, address, website,
                              bank_account_holder, bank_name, bank_account_number, bank_ifsc, bank_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $name,
        trim((string) ($body['phone'] ?? '')) ?: null,
        normalize_vendor_email($body['email'] ?? null),
        trim((string) ($body['gst_number'] ?? '')) ?: null,
        trim((string) ($body['address'] ?? '')) ?: null,
        normalize_vendor_website($body['website'] ?? null),
        nullable_vendor_text($body['bank_account_holder'] ?? null),
        nullable_vendor_text($body['bank_name'] ?? null),
        nullable_vendor_text($body['bank_account_number'] ?? null),
        normalize_vendor_ifsc($body['bank_ifsc'] ?? null),
        nullable_vendor_text($body['bank_address'] ?? null),
    ]);

    insert_vendor_contacts($pdo, $companyId, $id, $contacts);

    json_response(['id' => $id], 201);
}

function vendors_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'vendors', $id);
    $body = json_body();
    $fields = [
        'name', 'phone', 'email', 'gst_number', 'address', 'website',
        'bank_account_holder', 'bank_name', 'bank_account_number', 'bank_ifsc', 'bank_address',
    ];
    $sets = [];
    $params = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            if ($f === 'website') {
                $params[] = normalize_vendor_website($body[$f]);
            } elseif ($f === 'email') {
                $params[] = normalize_vendor_email($body[$f]);
            } elseif ($f === 'bank_ifsc') {
                $params[] = normalize_vendor_ifsc($body[$f]);
            } elseif (in_array($f, ['bank_account_holder', 'bank_name', 'bank_account_number', 'bank_address'], true)) {
                $params[] = nullable_vendor_text($body[$f]);
            } else {
                $params[] = $body[$f] === '' ? null : $body[$f];
            }
        }
    }

    $parsedContacts = null;
    if (array_key_exists('contacts', $body)) {
        $parsedContacts = parse_vendor_contacts($body['contacts']);
    }

    if (empty($sets) && $parsedContacts === null) {
        json_error('Nothing to update', 422);
    }

    $pdo = db();
    if (!empty($sets)) {
        $params[] = $id;
        $pdo->prepare('UPDATE vendors SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    }

    if ($parsedContacts !== null) {
        $companyId = row_company_id('vendors', $id);
        replace_vendor_contacts($pdo, $companyId, $id, $parsedContacts);
    }

    json_response(['ok' => true]);
}

function vendors_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'vendors', $id);
    db()->prepare('DELETE FROM vendors WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_chemicals(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        chemicals_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        chemicals_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        chemicals_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        chemicals_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function chemicals_list(array $ctx): void
{
    $scope = company_scope($ctx, 'c');
    $stmt = db()->prepare("SELECT * FROM chemicals c WHERE {$scope['sql']} ORDER BY c.name ASC");
    $stmt->execute($scope['params']);
    json_response($stmt->fetchAll());
}

function chemicals_create(array $ctx): void
{
    $body = json_body();
    $name = trim((string) ($body['name'] ?? ''));
    if ($name === '') {
        json_error('Chemical name is required', 422);
    }
    $companyId = insert_company_id($ctx);
    $id = uuid4();
    db()->prepare(
        'INSERT INTO chemicals (id, company_id, name, unit_of_measure) VALUES (?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $name,
        trim((string) ($body['unit_of_measure'] ?? 'kg')) ?: 'kg',
    ]);
    json_response(['id' => $id], 201);
}

function chemicals_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'chemicals', $id);
    $body = json_body();
    $sets = [];
    $params = [];
    foreach (['name', 'unit_of_measure'] as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            $params[] = $body[$f];
        }
    }
    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }
    $params[] = $id;
    db()->prepare('UPDATE chemicals SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function chemicals_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'chemicals', $id);
    db()->prepare('DELETE FROM chemicals WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_vendor_pricing(string $method, array $segments): void
{
    $write = in_array($method, ['POST'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === 'latest') {
        vendor_pricing_latest($ctx);
    }
    if ($method === 'GET' && $id === null) {
        vendor_pricing_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        vendor_pricing_create($ctx);
    }
    json_error('Not found', 404);
}

function vendor_pricing_list(array $ctx): void
{
    $scope = company_scope($ctx, 'vp');
    $sql = "SELECT vp.*, v.name AS vendor_name, c.name AS chemical_name, c.unit_of_measure
            FROM vendor_pricing vp
            INNER JOIN vendors v ON v.id = vp.vendor_id
            INNER JOIN chemicals c ON c.id = vp.chemical_id
            WHERE {$scope['sql']}";
    $params = $scope['params'];
    if (!empty($_GET['vendor_id'])) {
        $sql .= ' AND vp.vendor_id = ?';
        $params[] = $_GET['vendor_id'];
    }
    if (!empty($_GET['chemical_id'])) {
        $sql .= ' AND vp.chemical_id = ?';
        $params[] = $_GET['chemical_id'];
    }
    $sql .= ' ORDER BY c.name ASC, v.name ASC, vp.effective_date DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

function vendor_pricing_latest(array $ctx): void
{
    $vendorId = trim((string) ($_GET['vendor_id'] ?? ''));
    $chemicalId = trim((string) ($_GET['chemical_id'] ?? ''));
    if ($vendorId === '' || $chemicalId === '') {
        json_error('vendor_id and chemical_id are required', 422);
    }
    require_owned_row($ctx, 'vendors', $vendorId);
    require_owned_row($ctx, 'chemicals', $chemicalId);
    $asOf = trim((string) ($_GET['as_of'] ?? date('Y-m-d')));
    $row = latest_vendor_price($vendorId, $chemicalId, $asOf);
    json_response($row ?? null);
}

function vendor_pricing_create(array $ctx): void
{
    $body = json_body();
    $fields = require_fields(['vendor_id', 'chemical_id', 'price', 'effective_date']);
    require_owned_row($ctx, 'vendors', (string) $fields['vendor_id']);
    require_owned_row($ctx, 'chemicals', (string) $fields['chemical_id']);
    $companyId = insert_company_id($ctx);
    $id = uuid4();
    $pdo = db();
    try {
        $pdo->prepare(
            'INSERT INTO vendor_pricing (id, company_id, vendor_id, chemical_id, price, effective_date)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            $id, $companyId,
            $fields['vendor_id'], $fields['chemical_id'],
            $fields['price'], $fields['effective_date'],
        ]);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) {
            json_error('A price already exists for this vendor, chemical, and date', 409);
        }
        throw $e;
    }
    log_audit_action($pdo, $ctx, 'vendor_pricing', $id, 'INSERT', null, $fields);
    json_response(['id' => $id], 201);
}
