<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/uploads.php';

const DOCUMENT_TEMPLATE_TYPES = ['quotation', 'receipt', 'warranty'];

function documents_autoload(): bool
{
    $autoload = dirname(__DIR__) . '/vendor/autoload.php';
    if (!is_file($autoload)) {
        return false;
    }
    require_once $autoload;
    return true;
}

function document_templates_dir(): string
{
    return dirname(__DIR__) . '/uploads/document_templates';
}

function generated_documents_dir(string $companyId): string
{
    return dirname(__DIR__) . '/uploads/documents/' . $companyId;
}

function route_document_templates(string $method, array $segments): void
{
    $ctx = data_context($method !== 'GET');
    $id = $segments[0] ?? null;

    if ($method === 'GET' && $id === null) {
        document_templates_list($ctx);
    }
    if ($method === 'POST' && $id === null) {
        if (!$ctx['is_super_admin'] && !($ctx['is_owner'] ?? false)) {
            json_error('Only owners can upload templates', 403);
        }
        document_templates_upload($ctx);
    }
    if ($method === 'DELETE' && $id !== null) {
        if (!$ctx['is_super_admin'] && !($ctx['is_owner'] ?? false)) {
            json_error('Only owners can delete templates', 403);
        }
        document_templates_delete($ctx, $id);
    }
    json_error('Not found', 404);
}

function document_templates_list(array $ctx): void
{
    $scope = company_scope($ctx, 'dt');
    $stmt = db()->prepare(
        "SELECT id, template_type, file_path, is_active, created_at FROM document_templates dt
         WHERE {$scope['sql']} ORDER BY dt.template_type ASC"
    );
    $stmt->execute($scope['params']);
    json_response($stmt->fetchAll());
}

function document_templates_upload(array $ctx): void
{
    $type = trim((string) ($_POST['template_type'] ?? ''));
    if (!in_array($type, DOCUMENT_TEMPLATE_TYPES, true)) {
        json_error('Invalid template_type', 422);
    }
    if (empty($_FILES['template'])) {
        json_error('Template file is required', 422);
    }
    $companyId = insert_company_id($ctx);
    $dir = document_templates_dir();
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        json_error('Could not create upload directory', 500);
    }
    $ext = pathinfo($_FILES['template']['name'], PATHINFO_EXTENSION) ?: 'docx';
    if (strtolower($ext) !== 'docx') {
        json_error('Template must be a .docx file', 422);
    }
    $filename = $companyId . '_' . $type . '.docx';
    $dest = $dir . '/' . $filename;
    if (!move_uploaded_file($_FILES['template']['tmp_name'], $dest)) {
        json_error('Could not save template', 500);
    }
    $relative = 'uploads/document_templates/' . $filename;

    $existing = db()->prepare(
        'SELECT id FROM document_templates WHERE company_id = ? AND template_type = ? LIMIT 1'
    );
    $existing->execute([$companyId, $type]);
    $row = $existing->fetch();
    if ($row) {
        db()->prepare(
            'UPDATE document_templates SET file_path = ?, is_active = 1 WHERE id = ?'
        )->execute([$relative, $row['id']]);
        json_response(['id' => $row['id'], 'file_path' => $relative]);
    }

    $id = uuid4();
    db()->prepare(
        'INSERT INTO document_templates (id, company_id, template_type, file_path, is_active)
         VALUES (?, ?, ?, ?, 1)'
    )->execute([$id, $companyId, $type, $relative]);
    json_response(['id' => $id, 'file_path' => $relative], 201);
}

function document_templates_delete(array $ctx, string $id): void
{
    require_owned_row($ctx, 'document_templates', $id);
    db()->prepare('UPDATE document_templates SET is_active = 0 WHERE id = ?')->execute([$id]);
    json_response(['ok' => true]);
}

function route_documents(string $method, array $segments): void
{
    $ctx = data_context(true);
    $action = $segments[0] ?? null;

    if ($method === 'POST' && $action === 'generate') {
        documents_generate($ctx);
    }
    if ($method === 'GET' && $action === null) {
        documents_list($ctx);
    }
    json_error('Not found', 404);
}

function documents_list(array $ctx): void
{
    $scope = company_scope($ctx, 'gd');
    $sql = "SELECT gd.*, p.project_title FROM generated_documents gd
            INNER JOIN projects p ON p.id = gd.project_id
            WHERE {$scope['sql']}";
    $params = $scope['params'];
    if (!empty($_GET['project_id'])) {
        $sql .= ' AND gd.project_id = ?';
        $params[] = $_GET['project_id'];
    }
    $sql .= ' ORDER BY gd.created_at DESC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

function document_merge_placeholders(array $project, array $client, ?string $companyName): array
{
    return [
        'client_name'    => $client['name'] ?? $project['client_name'] ?? '',
        'project_title'  => $project['project_title'] ?? '',
        'location'       => $project['location'] ?? '',
        'quoted_amount'  => (string) ($project['total_quoted_amount'] ?? ''),
        'company_name'   => $companyName ?? '',
        'date'           => date('Y-m-d'),
    ];
}

function documents_generate(array $ctx): void
{
    if (!documents_autoload()) {
        json_error('Document generation unavailable — run composer install in api/', 503);
    }

    $body = json_body();
    $projectId = trim((string) ($body['project_id'] ?? ''));
    $templateType = trim((string) ($body['template_type'] ?? ''));
    if ($projectId === '' || !in_array($templateType, DOCUMENT_TEMPLATE_TYPES, true)) {
        json_error('project_id and valid template_type are required', 422);
    }

    require_owned_row($ctx, 'projects', $projectId);
    require_once __DIR__ . '/projects.php';
    $pStmt = db()->prepare(projects_select_sql() . ' WHERE p.id = ?');
    $pStmt->execute([$projectId]);
    $project = project_out($pStmt->fetch());

    $client = ['name' => $project['client_name'] ?? ''];
    if (!empty($project['client_id'])) {
        $cStmt = db()->prepare('SELECT name, email, phone, location FROM clients WHERE id = ?');
        $cStmt->execute([$project['client_id']]);
        $client = $cStmt->fetch() ?: $client;
    }

    $companyId = row_company_id('projects', $projectId);
    $tStmt = db()->prepare(
        'SELECT * FROM document_templates WHERE company_id = ? AND template_type = ? AND is_active = 1 LIMIT 1'
    );
    $tStmt->execute([$companyId, $templateType]);
    $template = $tStmt->fetch();
    if (!$template) {
        json_error('No active template for this type — upload one in Catalog settings', 404);
    }

    $coStmt = db()->prepare('SELECT name FROM companies WHERE id = ?');
    $coStmt->execute([$companyId]);
    $company = $coStmt->fetch();

    $templatePath = dirname(__DIR__) . '/' . ltrim($template['file_path'], '/');
    if (!is_file($templatePath)) {
        json_error('Template file missing on server', 500);
    }

    $outDir = generated_documents_dir($companyId);
    if (!is_dir($outDir) && !mkdir($outDir, 0755, true) && !is_dir($outDir)) {
        json_error('Could not create output directory', 500);
    }

    $outName = $templateType . '_' . $projectId . '_' . date('Ymd_His') . '.docx';
    $outPath = $outDir . '/' . $outName;
    $relativeOut = 'uploads/documents/' . $companyId . '/' . $outName;

    $placeholders = document_merge_placeholders($project, $client, $company['name'] ?? null);

    $processor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);
    foreach ($placeholders as $key => $value) {
        $processor->setValue($key, (string) $value);
    }
    $processor->saveAs($outPath);

    $docId = uuid4();
    db()->prepare(
        'INSERT INTO generated_documents (id, company_id, project_id, template_type, file_path, generated_by)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([
        $docId, $companyId, $projectId, $templateType, $relativeOut, $ctx['user']['id'],
    ]);

    json_response([
        'id'        => $docId,
        'file_path' => $relativeOut,
        'url'       => '/api/' . $relativeOut,
    ], 201);
}
