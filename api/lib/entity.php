<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/session.php';

const ENTITY_TYPES = ['lead', 'project'];

function normalize_entity_type(?string $type): string
{
    $value = trim((string) ($type ?? ''));
    if (!in_array($value, ENTITY_TYPES, true)) {
        json_error('entity_type must be lead or project', 422);
    }
    return $value;
}

function entity_table(string $entityType): string
{
    return match ($entityType) {
        'lead' => 'leads',
        default => 'projects',
    };
}

function validate_entity_ref(array $ctx, string $entityType, string $entityId): void
{
    normalize_entity_type($entityType);
    require_owned_row($ctx, entity_table($entityType), $entityId);
}

function move_entity_children(PDO $pdo, string $companyId, string $fromType, string $fromId, string $toType, string $toId): void
{
    $pdo->prepare(
        'UPDATE entity_contacts SET entity_type = ?, entity_id = ?
         WHERE company_id = ? AND entity_type = ? AND entity_id = ?'
    )->execute([$toType, $toId, $companyId, $fromType, $fromId]);

    $pdo->prepare(
        'UPDATE entity_project_types SET entity_type = ?, entity_id = ?
         WHERE company_id = ? AND entity_type = ? AND entity_id = ?'
    )->execute([$toType, $toId, $companyId, $fromType, $fromId]);

    $pdo->prepare(
        'UPDATE tasks SET entity_type = ?, entity_id = ?
         WHERE company_id = ? AND entity_type = ? AND entity_id = ?'
    )->execute([$toType, $toId, $companyId, $fromType, $fromId]);
}

function lead_status_to_project_status(string $leadStatus): string
{
    return match ($leadStatus) {
        'site_visit_scheduled' => 'site visit done',
        'quotation_pending', 'quotation_sent' => 'quotation sent',
        default => 'site visit requested',
    };
}
