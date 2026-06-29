<?php

declare(strict_types=1);

const COMPANY_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const COMPANY_LOGO_MIME_MAP = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

function company_logo_dir(): string
{
    return dirname(__DIR__) . '/uploads/logos';
}

function company_logo_public_path(string $companyId, string $ext): string
{
    return 'uploads/logos/' . $companyId . '.' . $ext;
}

function delete_company_logo_files(string $companyId): void
{
    $dir = company_logo_dir();
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $ext) {
        $path = $dir . '/' . $companyId . '.' . $ext;
        if (is_file($path)) {
            unlink($path);
        }
    }
}

function save_company_logo_upload(string $companyId, array $file): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_error('Logo upload failed', 422);
    }
    if (($file['size'] ?? 0) > COMPANY_LOGO_MAX_BYTES) {
        json_error('Logo must be 2 MB or smaller', 422);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    $ext = COMPANY_LOGO_MIME_MAP[$mime] ?? null;
    if (!$ext) {
        json_error('Logo must be a JPEG, PNG, or WebP image', 422);
    }

    $dir = company_logo_dir();
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        json_error('Could not create upload directory', 500);
    }

    delete_company_logo_files($companyId);
    $filename = $companyId . '.' . $ext;
    $dest = $dir . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        json_error('Could not save logo', 500);
    }

    return company_logo_public_path($companyId, $ext);
}

const COMPANY_FAVICON_MAX_BYTES = 512 * 1024;
const COMPANY_FAVICON_MIME_MAP = [
    'image/png'  => 'png',
    'image/jpeg' => 'jpg',
    'image/webp' => 'webp',
];

function company_favicon_dir(): string
{
    return dirname(__DIR__) . '/uploads/favicons';
}

function company_favicon_public_path(string $companyId, string $ext): string
{
    return 'uploads/favicons/' . $companyId . '.' . $ext;
}

function delete_company_favicon_files(string $companyId): void
{
    $dir = company_favicon_dir();
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $ext) {
        $path = $dir . '/' . $companyId . '.' . $ext;
        if (is_file($path)) {
            unlink($path);
        }
    }
}

function save_company_favicon_upload(string $companyId, array $file): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_error('Favicon upload failed', 422);
    }
    if (($file['size'] ?? 0) > COMPANY_FAVICON_MAX_BYTES) {
        json_error('Favicon must be 512 KB or smaller', 422);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    $ext = COMPANY_FAVICON_MIME_MAP[$mime] ?? null;
    if (!$ext) {
        json_error('Favicon must be a JPEG, PNG, or WebP image', 422);
    }

    $dir = company_favicon_dir();
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        json_error('Could not create upload directory', 500);
    }

    delete_company_favicon_files($companyId);
    $filename = $companyId . '.' . $ext;
    $dest = $dir . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        json_error('Could not save favicon', 500);
    }

    return company_favicon_public_path($companyId, $ext);
}

function require_company_owner(array $user): string
{
    $profile = profile_for($user['id']);
    if (!$profile || ($profile['role'] ?? '') !== 'owner' || empty($profile['company_id'])) {
        json_error('Only company owners can manage branding', 403);
    }
    return (string) $profile['company_id'];
}
