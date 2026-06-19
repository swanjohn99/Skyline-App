<?php

declare(strict_types=1);

// JSON request/response helpers. Errors are emitted as { "message": ... }
// to match the frontend's `catch (err) { ...err.message }` expectations.

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function json_error(string $message, int $status = 400): void
{
    json_response(['message' => $message], $status);
}

// Parsed JSON body of the current request (empty array when absent/invalid).
function json_body(): array
{
    static $body = null;
    if ($body !== null) {
        return $body;
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        $body = [];
        return $body;
    }
    $decoded = json_decode($raw, true);
    $body = is_array($decoded) ? $decoded : [];
    return $body;
}

// Read a field from the JSON body with an optional default.
function body_field(string $key, $default = null)
{
    $body = json_body();
    return array_key_exists($key, $body) ? $body[$key] : $default;
}

// Require one or more fields to be present and non-empty.
function require_fields(array $keys): array
{
    $body = json_body();
    $out = [];
    foreach ($keys as $key) {
        if (!isset($body[$key]) || $body[$key] === '') {
            json_error("Missing required field: $key", 422);
        }
        $out[$key] = $body[$key];
    }
    return $out;
}
