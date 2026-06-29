<?php

declare(strict_types=1);

const LOAN_INTEREST_PERIODS = ['year', 'month'];

function normalize_interest_period(?string $period): string
{
    $value = trim((string) ($period ?? 'year'));
    if (!in_array($value, LOAN_INTEREST_PERIODS, true)) {
        json_error('Interest period must be year or month', 422);
    }
    return $value;
}

function loan_days_between(DateTimeInterface $from, DateTimeInterface $to): int
{
    if ($to <= $from) {
        return 0;
    }
    return (int) $from->diff($to)->days;
}

function accrue_loan_interest(float $balance, float $rate, string $period, int $days): float
{
    if ($balance <= 0 || $rate <= 0 || $days <= 0) {
        return 0.0;
    }
    if ($period === 'month') {
        return $balance * ($rate / 100) * ($days / 30);
    }
    return $balance * ($rate / 100) * ($days / 365);
}

/**
 * Simple interest on outstanding principal. Repayments pay accrued interest first, then principal.
 *
 * @param array<string, mixed> $loan
 * @param list<array<string, mixed>> $repayments
 * @return array{principal_lent: float, total_repaid: float, principal_outstanding: float, accrued_interest: float, pending: float}
 */
function calculate_loan_balances(array $loan, array $repayments, ?DateTimeImmutable $asOf = null): array
{
    $asOf = $asOf ?? new DateTimeImmutable('today');
    $principal = (float) $loan['principal_amount'];
    $rate = (float) $loan['interest_rate'];
    $period = (string) ($loan['interest_period'] ?? 'year');

    $sorted = $repayments;
    usort($sorted, static function (array $a, array $b): int {
        return strcmp((string) $a['repayment_date'], (string) $b['repayment_date']);
    });

    $balance = $principal;
    $accruedInterest = 0.0;
    $totalRepaid = 0.0;
    $lastDate = new DateTimeImmutable((string) $loan['loan_date']);

    foreach ($sorted as $rep) {
        $repDate = new DateTimeImmutable((string) $rep['repayment_date']);
        if ($repDate > $asOf) {
            break;
        }

        $days = loan_days_between($lastDate, $repDate);
        $accruedInterest += accrue_loan_interest($balance, $rate, $period, $days);

        $amount = (float) $rep['amount'];
        $totalRepaid += $amount;

        $payInterest = min($amount, $accruedInterest);
        $accruedInterest -= $payInterest;
        $remaining = $amount - $payInterest;
        $balance = max(0.0, $balance - $remaining);

        $lastDate = $repDate;
    }

    if ($lastDate < $asOf) {
        $days = loan_days_between($lastDate, $asOf);
        $accruedInterest += accrue_loan_interest($balance, $rate, $period, $days);
    }

    $balance = round($balance, 2);
    $accruedInterest = round($accruedInterest, 2);

    return [
        'principal_lent'        => round($principal, 2),
        'total_repaid'          => round($totalRepaid, 2),
        'principal_outstanding' => $balance,
        'accrued_interest'      => $accruedInterest,
        'pending'               => round($balance + $accruedInterest, 2),
    ];
}

function format_interest_rate_label(float $rate, string $period): string
{
    $formatted = rtrim(rtrim(number_format($rate, 2, '.', ''), '0'), '.');
    return $period === 'month'
        ? "{$formatted}% / month"
        : "{$formatted}% / year";
}
