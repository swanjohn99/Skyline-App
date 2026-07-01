<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function latest_vendor_price(string $vendorId, string $chemicalId, ?string $asOfDate = null): ?array
{
    $asOf = $asOfDate ?: date('Y-m-d');
    $stmt = db()->prepare(
        'SELECT * FROM vendor_pricing
         WHERE vendor_id = ? AND chemical_id = ? AND effective_date <= ?
         ORDER BY effective_date DESC
         LIMIT 1'
    );
    $stmt->execute([$vendorId, $chemicalId, $asOf]);
    $row = $stmt->fetch();
    return $row ?: null;
}
