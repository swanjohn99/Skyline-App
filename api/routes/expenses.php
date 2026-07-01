<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/audit.php';
require_once __DIR__ . '/../lib/vendor_pricing.php';

const EXPENSE_TYPES = ['material', 'labour', 'transportation', 'other'];

function normalize_expense_type(?string $type): string
{
    $value = trim((string) ($type ?? 'other'));
    if (!in_array($value, EXPENSE_TYPES, true)) {
        json_error('Expense type must be material, labour, transportation, or other', 422);
    }
    return $value;
}

function validate_non_negative_amount($value, string $field): float
{
    if ($value === '' || $value === null) {
        json_error("$field is required", 422);
    }
    $n = (float) $value;
    if ($n < 0) {
        json_error("$field cannot be negative", 422);
    }
    return $n;
}

function route_expenses(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        if (isset($_GET['project_id'])) {
            expenses_by_project($ctx, (string) $_GET['project_id']);
        }
        expenses_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        expenses_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        expenses_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        expenses_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function expenses_select_sql(): string
{
    return 'SELECT e.*, p.project_title, p.client_name, v.name AS vendor_name
            FROM expenses e
            LEFT JOIN projects p ON p.id = e.project_id
            LEFT JOIN vendors v ON v.id = e.vendor_id';
}

function load_expense_items(string $expenseId): array
{
    $stmt = db()->prepare(
        'SELECT ei.*, c.name AS chemical_name
         FROM expense_items ei
         LEFT JOIN chemicals c ON c.id = ei.chemical_id
         WHERE ei.expense_id = ?
         ORDER BY ei.sort_order ASC, ei.created_at ASC'
    );
    $stmt->execute([$expenseId]);
    return $stmt->fetchAll();
}

function expense_out(array $row): array
{
    $row['projects'] = [
        'project_title' => $row['project_title'],
        'client_name'   => $row['client_name'],
    ];
    $row['items'] = load_expense_items($row['id']);
    unset($row['project_title'], $row['client_name']);
    return $row;
}

function expenses_list(array $ctx): void
{
    $scope = company_scope($ctx, 'e');
    $sql = expenses_select_sql() . " WHERE {$scope['sql']} ORDER BY e.expense_date DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($scope['params']);
    json_response(array_map('expense_out', $stmt->fetchAll()));
}

function expenses_by_project(array $ctx, string $projectId): void
{
    require_owned_row($ctx, 'projects', $projectId);
    $stmt = db()->prepare(
        expenses_select_sql() . ' WHERE e.project_id = ? ORDER BY e.expense_date DESC'
    );
    $stmt->execute([$projectId]);
    json_response(array_map('expense_out', $stmt->fetchAll()));
}

function parse_expense_items(array $ctx, array $items, string $vendorId, ?string $expenseDate): array
{
    if (empty($items)) {
        json_error('At least one item is required for material expenses', 422);
    }

    require_owned_row($ctx, 'vendors', $vendorId);

    $parsed = [];
    $total = 0.0;
    $sort = 0;

    foreach ($items as $item) {
        if (!is_array($item)) {
            json_error('Invalid expense item', 422);
        }

        $chemicalId = trim((string) ($item['chemical_id'] ?? '')) ?: null;
        $customName = trim((string) ($item['custom_name'] ?? '')) ?: null;

        if (!$chemicalId && !$customName) {
            json_error('Each item needs a catalogue chemical or a custom name', 422);
        }
        if ($chemicalId) {
            require_owned_row($ctx, 'chemicals', $chemicalId);
        }

        $qty = validate_non_negative_amount($item['quantity'] ?? null, 'quantity');
        if ($qty <= 0) {
            json_error('Quantity must be greater than zero', 422);
        }

        $unitPrice = null;
        $vendorPricingId = null;

        if ($chemicalId) {
            $latest = latest_vendor_price($vendorId, $chemicalId, $expenseDate);
            if ($latest) {
                $unitPrice = (float) $latest['price'];
                $vendorPricingId = $latest['id'];
            }
        }

        if (array_key_exists('unit_price', $item) && $item['unit_price'] !== '' && $item['unit_price'] !== null) {
            $unitPrice = validate_non_negative_amount($item['unit_price'], 'unit_price');
        }

        if ($unitPrice === null) {
            json_error('Unit price is required for each item', 422);
        }

        if (!empty($item['vendor_pricing_id'])) {
            require_owned_row($ctx, 'vendor_pricing', (string) $item['vendor_pricing_id']);
            $vendorPricingId = (string) $item['vendor_pricing_id'];
        }

        $lineTotal = round($unitPrice * $qty, 2);
        $total += $lineTotal;

        $parsed[] = [
            'chemical_id'       => $chemicalId,
            'custom_name'       => $customName,
            'unit_price'        => $unitPrice,
            'quantity'          => $qty,
            'line_total'        => $lineTotal,
            'vendor_pricing_id' => $vendorPricingId,
            'sort_order'        => $sort++,
        ];
    }

    return ['items' => $parsed, 'total' => round($total, 2)];
}

function insert_expense_items(PDO $pdo, string $companyId, string $expenseId, array $items): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO expense_items (id, company_id, expense_id, chemical_id, custom_name, unit_price, quantity, line_total, vendor_pricing_id, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    foreach ($items as $item) {
        $stmt->execute([
            uuid4(),
            $companyId,
            $expenseId,
            $item['chemical_id'],
            $item['custom_name'],
            $item['unit_price'],
            $item['quantity'],
            $item['line_total'],
            $item['vendor_pricing_id'],
            $item['sort_order'],
        ]);
    }
}

function replace_expense_items(PDO $pdo, string $companyId, string $expenseId, array $items): void
{
    $pdo->prepare('DELETE FROM expense_items WHERE expense_id = ?')->execute([$expenseId]);
    if (!empty($items)) {
        insert_expense_items($pdo, $companyId, $expenseId, $items);
    }
}

function expenses_create(array $ctx): void
{
    $fields = require_fields(['project_id', 'expense_date']);
    require_owned_row($ctx, 'projects', (string) $fields['project_id']);
    $companyId = row_company_id('projects', (string) $fields['project_id']);
    $expenseType = normalize_expense_type(body_field('expense_type'));
    $body = json_body();

    $vendorId = trim((string) ($body['vendor_id'] ?? '')) ?: null;
    $amount = null;
    $parsedItems = [];

    if ($expenseType === 'material') {
        if (!$vendorId) {
            json_error('Vendor is required for material expenses', 422);
        }
        $parsed = parse_expense_items($ctx, $body['items'] ?? [], $vendorId, $fields['expense_date']);
        $parsedItems = $parsed['items'];
        $amount = $parsed['total'];
    } else {
        $amount = validate_non_negative_amount($fields['amount'] ?? $body['amount'] ?? null, 'amount');
        if ($amount <= 0) {
            json_error('Amount must be greater than zero', 422);
        }
    }

    $id = uuid4();
    $pdo = db();
    $pdo->prepare(
        'INSERT INTO expenses (id, company_id, project_id, expense_type, vendor_id, amount, description, expense_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $fields['project_id'],
        $expenseType,
        $vendorId,
        $amount,
        body_field('description'),
        $fields['expense_date'],
    ]);

    if (!empty($parsedItems)) {
        insert_expense_items($pdo, $companyId, $id, $parsedItems);
    }

    log_audit_action($pdo, $ctx, 'expenses', $id, 'INSERT', null, ['amount' => $amount]);
    json_response(['id' => $id], 201);
}

function expenses_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'expenses', $id);
    $before = db()->prepare('SELECT * FROM expenses WHERE id = ?');
    $before->execute([$id]);
    $beforeRow = $before->fetch();
    $body = json_body();
    $pdo = db();

    $expenseType = array_key_exists('expense_type', $body)
        ? normalize_expense_type($body['expense_type'])
        : $beforeRow['expense_type'];

    $sets = [];
    $params = [];
    $companyId = $beforeRow['company_id'];
    $parsedItems = null;

    if (array_key_exists('project_id', $body)) {
        require_owned_row($ctx, 'projects', (string) $body['project_id']);
        $sets[] = 'project_id = ?';
        $params[] = $body['project_id'];
        $sets[] = 'company_id = ?';
        $params[] = row_company_id('projects', (string) $body['project_id']);
        $companyId = row_company_id('projects', (string) $body['project_id']);
    }

    if (array_key_exists('expense_type', $body)) {
        $sets[] = 'expense_type = ?';
        $params[] = $expenseType;
    }

    $expenseDate = array_key_exists('expense_date', $body)
        ? (string) $body['expense_date']
        : $beforeRow['expense_date'];

    if ($expenseType === 'material') {
        $vendorId = array_key_exists('vendor_id', $body)
            ? (trim((string) ($body['vendor_id'] ?? '')) ?: null)
            : $beforeRow['vendor_id'];

        if (!$vendorId) {
            json_error('Vendor is required for material expenses', 422);
        }

        if (array_key_exists('vendor_id', $body)) {
            require_owned_row($ctx, 'vendors', $vendorId);
            $sets[] = 'vendor_id = ?';
            $params[] = $vendorId;
        }

        if (array_key_exists('items', $body)) {
            $parsed = parse_expense_items($ctx, $body['items'], $vendorId, $expenseDate);
            $parsedItems = $parsed['items'];
            $sets[] = 'amount = ?';
            $params[] = $parsed['total'];
        }
    } else {
        if (array_key_exists('vendor_id', $body)) {
            if ($body['vendor_id']) {
                require_owned_row($ctx, 'vendors', (string) $body['vendor_id']);
            }
            $sets[] = 'vendor_id = ?';
            $params[] = $body['vendor_id'] ?: null;
        }
        if (array_key_exists('amount', $body)) {
            $amount = validate_non_negative_amount($body['amount'], 'amount');
            if ($amount <= 0) {
                json_error('Amount must be greater than zero', 422);
            }
            $sets[] = 'amount = ?';
            $params[] = $amount;
        }
        if (array_key_exists('items', $body)) {
            $parsedItems = [];
        }
    }

    if (array_key_exists('description', $body)) {
        $sets[] = 'description = ?';
        $params[] = $body['description'] === '' ? null : $body['description'];
    }
    if (array_key_exists('expense_date', $body)) {
        $sets[] = 'expense_date = ?';
        $params[] = $body['expense_date'];
    }

    if (empty($sets) && $parsedItems === null) {
        json_error('Nothing to update', 422);
    }

    if (!empty($sets)) {
        $params[] = $id;
        $pdo->prepare('UPDATE expenses SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    }

    if ($parsedItems !== null) {
        replace_expense_items($pdo, $companyId, $id, $parsedItems);
    } elseif ($expenseType !== 'material' && array_key_exists('expense_type', $body) && $body['expense_type'] !== 'material') {
        $pdo->prepare('DELETE FROM expense_items WHERE expense_id = ?')->execute([$id]);
    }

    $after = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
    $after->execute([$id]);
    log_audit_action($pdo, $ctx, 'expenses', $id, 'UPDATE', $beforeRow, $after->fetch());
    json_response(['ok' => true]);
}

function expenses_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'expenses', $id);
    db()->prepare('DELETE FROM expenses WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
