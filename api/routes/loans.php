<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/loan_interest.php';

const LOAN_FIELDS = ['lender_id', 'principal_amount', 'loan_date', 'interest_rate', 'interest_period', 'notes'];
const LOAN_REPAYMENT_METHODS = ['cash', 'online_transfer'];

function normalize_loan_repayment_method(?string $method): string
{
    $value = trim((string) ($method ?? 'cash'));
    if (!in_array($value, LOAN_REPAYMENT_METHODS, true)) {
        json_error('Payment method must be cash or online_transfer', 422);
    }
    return $value;
}

function route_loans(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        loans_list($ctx);
    }
    if ($method === 'GET' && $id !== null) {
        loans_get($ctx, $id);
    }
    if ($method === 'POST' && $id === null) {
        loans_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        loans_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        loans_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function loans_select_sql(): string
{
    return 'SELECT lo.*, l.name AS lender_name, l.phone AS lender_phone, l.address AS lender_address
            FROM loans lo
            INNER JOIN lenders l ON l.id = lo.lender_id';
}

function loans_fetch_repayments_by_loan(array $ctx): array
{
    $scope = company_scope($ctx, 'lr');
    $stmt = db()->prepare(
        "SELECT lr.* FROM loan_repayments lr WHERE {$scope['sql']} ORDER BY lr.repayment_date ASC"
    );
    $stmt->execute($scope['params']);
    $grouped = [];
    foreach ($stmt->fetchAll() as $row) {
        $grouped[$row['loan_id']][] = $row;
    }
    return $grouped;
}

function loan_out(array $row, array $repayments = []): array
{
    $balances = calculate_loan_balances($row, $repayments);
    $rate = (float) $row['interest_rate'];
    $period = (string) $row['interest_period'];

    return array_merge($row, $balances, [
        'interest_rate_label' => format_interest_rate_label($rate, $period),
        'repayments'        => array_map('loan_repayment_out', $repayments),
    ]);
}

function loans_list(array $ctx): void
{
    $scope = company_scope($ctx, 'lo');
    $stmt = db()->prepare(
        loans_select_sql() . " WHERE {$scope['sql']} ORDER BY lo.loan_date DESC"
    );
    $stmt->execute($scope['params']);
    $rows = $stmt->fetchAll();
    $repaymentsByLoan = loans_fetch_repayments_by_loan($ctx);

    json_response(array_map(
        static fn (array $row) => loan_out($row, $repaymentsByLoan[$row['id']] ?? []),
        $rows
    ));
}

function loans_get(array $ctx, string $id): void
{
    require_owned_row($ctx, 'loans', $id);
    $stmt = db()->prepare(loans_select_sql() . ' WHERE lo.id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Not found', 404);
    }

    $repStmt = db()->prepare(
        'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY repayment_date ASC'
    );
    $repStmt->execute([$id]);
    json_response(loan_out($row, $repStmt->fetchAll()));
}

function loans_create(array $ctx): void
{
    $body = json_body();
    $lenderId = trim((string) ($body['lender_id'] ?? ''));
    if ($lenderId === '') {
        json_error('Lender is required', 422);
    }
    require_owned_row($ctx, 'lenders', $lenderId);

    $principal = $body['principal_amount'] ?? null;
    $loanDate = trim((string) ($body['loan_date'] ?? ''));
    if ($principal === null || $principal === '' || (float) $principal <= 0) {
        json_error('Principal amount must be greater than zero', 422);
    }
    if ($loanDate === '') {
        json_error('Loan date is required', 422);
    }

    $companyId = insert_company_id($ctx);
    $interestPeriod = normalize_interest_period($body['interest_period'] ?? 'year');
    $interestRate = isset($body['interest_rate']) ? (float) $body['interest_rate'] : 0.0;
    if ($interestRate < 0) {
        json_error('Interest rate cannot be negative', 422);
    }

    $notes = $body['notes'] ?? null;
    $notes = $notes === null || trim((string) $notes) === '' ? null : trim((string) $notes);

    $id = uuid4();
    db()->prepare(
        'INSERT INTO loans (id, company_id, lender_id, principal_amount, loan_date, interest_rate, interest_period, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $lenderId,
        $principal,
        $loanDate,
        $interestRate,
        $interestPeriod,
        $notes,
    ]);

    $stmt = db()->prepare(loans_select_sql() . ' WHERE lo.id = ?');
    $stmt->execute([$id]);
    json_response(loan_out($stmt->fetch(), []), 201);
}

function loans_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'loans', $id);
    $body = json_body();

    $sets = [];
    $params = [];

    if (array_key_exists('lender_id', $body)) {
        require_owned_row($ctx, 'lenders', (string) $body['lender_id']);
        $sets[] = 'lender_id = ?';
        $params[] = $body['lender_id'];
    }
    if (array_key_exists('principal_amount', $body)) {
        if ((float) $body['principal_amount'] <= 0) {
            json_error('Principal amount must be greater than zero', 422);
        }
        $sets[] = 'principal_amount = ?';
        $params[] = $body['principal_amount'];
    }
    if (array_key_exists('loan_date', $body)) {
        $sets[] = 'loan_date = ?';
        $params[] = $body['loan_date'];
    }
    if (array_key_exists('interest_rate', $body)) {
        if ((float) $body['interest_rate'] < 0) {
            json_error('Interest rate cannot be negative', 422);
        }
        $sets[] = 'interest_rate = ?';
        $params[] = $body['interest_rate'];
    }
    if (array_key_exists('interest_period', $body)) {
        $sets[] = 'interest_period = ?';
        $params[] = normalize_interest_period($body['interest_period']);
    }
    if (array_key_exists('notes', $body)) {
        $notes = $body['notes'];
        $sets[] = 'notes = ?';
        $params[] = $notes === null || trim((string) $notes) === '' ? null : trim((string) $notes);
    }

    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }

    $params[] = $id;
    db()->prepare('UPDATE loans SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function loans_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'loans', $id);
    db()->prepare('DELETE FROM loans WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function loan_repayment_out(array $row): array
{
    return $row;
}

function route_loan_repayments(string $method, array $segments): void
{
    $write = in_array($method, ['POST', 'PATCH', 'DELETE'], true);
    $ctx = data_context($write);
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        if (isset($_GET['loan_id'])) {
            loan_repayments_by_loan($ctx, (string) $_GET['loan_id']);
        }
        loan_repayments_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        loan_repayments_create($ctx);
    }
    if ($method === 'PATCH' && $id !== null) {
        loan_repayments_update($ctx, $id);
    }
    if ($method === 'DELETE' && $id !== null) {
        loan_repayments_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function loan_repayments_list(array $ctx): void
{
    $scope = company_scope($ctx, 'lr');
    $sql = "SELECT lr.*, lo.lender_id, l.name AS lender_name
            FROM loan_repayments lr
            INNER JOIN loans lo ON lo.id = lr.loan_id
            INNER JOIN lenders l ON l.id = lo.lender_id
            WHERE {$scope['sql']}
            ORDER BY lr.repayment_date DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($scope['params']);
    json_response($stmt->fetchAll());
}

function loan_repayments_by_loan(array $ctx, string $loanId): void
{
    require_owned_row($ctx, 'loans', $loanId);
    $stmt = db()->prepare(
        'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY repayment_date DESC'
    );
    $stmt->execute([$loanId]);
    json_response($stmt->fetchAll());
}

function loan_repayments_create(array $ctx): void
{
    $fields = require_fields(['loan_id', 'amount', 'repayment_date']);
    require_owned_row($ctx, 'loans', (string) $fields['loan_id']);
    $companyId = row_company_id('loans', (string) $fields['loan_id']);

    if ((float) $fields['amount'] <= 0) {
        json_error('Repayment amount must be greater than zero', 422);
    }

    $paymentMethod = normalize_loan_repayment_method(body_field('payment_method'));
    $comments = body_field('comments');
    $comments = $comments === null || trim((string) $comments) === '' ? null : trim((string) $comments);

    $id = uuid4();
    db()->prepare(
        'INSERT INTO loan_repayments (id, company_id, loan_id, amount, repayment_date, payment_method, comments)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $companyId,
        $fields['loan_id'],
        $fields['amount'],
        $fields['repayment_date'],
        $paymentMethod,
        $comments,
    ]);
    json_response(['id' => $id], 201);
}

function loan_repayments_update(array $ctx, string $id): void
{
    require_owned_row($ctx, 'loan_repayments', $id);
    $body = json_body();

    $sets = [];
    $params = [];

    if (array_key_exists('loan_id', $body)) {
        require_owned_row($ctx, 'loans', (string) $body['loan_id']);
        $sets[] = 'loan_id = ?';
        $params[] = $body['loan_id'];
        $sets[] = 'company_id = ?';
        $params[] = row_company_id('loans', (string) $body['loan_id']);
    }
    if (array_key_exists('payment_method', $body)) {
        $sets[] = 'payment_method = ?';
        $params[] = normalize_loan_repayment_method($body['payment_method']);
    }
    if (array_key_exists('amount', $body)) {
        if ((float) $body['amount'] <= 0) {
            json_error('Repayment amount must be greater than zero', 422);
        }
        $sets[] = 'amount = ?';
        $params[] = $body['amount'];
    }
    if (array_key_exists('repayment_date', $body)) {
        $sets[] = 'repayment_date = ?';
        $params[] = $body['repayment_date'];
    }
    if (array_key_exists('comments', $body)) {
        $comments = $body['comments'];
        $sets[] = 'comments = ?';
        $params[] = $comments === null || trim((string) $comments) === '' ? null : trim((string) $comments);
    }

    if (empty($sets)) {
        json_error('Nothing to update', 422);
    }

    $params[] = $id;
    db()->prepare('UPDATE loan_repayments SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    json_response(['ok' => true]);
}

function loan_repayments_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'loan_repayments', $id);
    db()->prepare('DELETE FROM loan_repayments WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}
