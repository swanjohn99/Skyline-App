<?php

declare(strict_types=1);

// Minimal, dependency-free mailer.
// Uses SMTP (with AUTH LOGIN) when SMTP_HOST is configured in api/.env,
// otherwise falls back to PHP's mail(). Returns true on success.

function send_mail(string $toEmail, string $subject, string $htmlBody, string $textBody = ''): bool
{
    $config = require __DIR__ . '/../config.php';
    $mail = $config['mail'];

    if ($textBody === '') {
        $textBody = trim(strip_tags($htmlBody));
    }

    if (!empty($mail['smtp_host'])) {
        try {
            return smtp_send($mail, $toEmail, $subject, $htmlBody, $textBody);
        } catch (Throwable $e) {
            error_log('SMTP send failed: ' . $e->getMessage());
            return false;
        }
    }

    // Fallback: PHP mail().
    $boundary = 'b' . bin2hex(random_bytes(8));
    $headers = [
        'MIME-Version: 1.0',
        "From: {$mail['from_name']} <{$mail['from']}>",
        "Content-Type: multipart/alternative; boundary=\"$boundary\"",
    ];
    $body = "--$boundary\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n\r\n" . $textBody . "\r\n"
        . "--$boundary\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n\r\n" . $htmlBody . "\r\n"
        . "--$boundary--";
    return mail($toEmail, $subject, $body, implode("\r\n", $headers));
}

function smtp_send(array $mail, string $to, string $subject, string $html, string $text): bool
{
    $host = $mail['smtp_host'];
    $port = $mail['smtp_port'] ?: 587;
    $secure = strtolower((string) $mail['smtp_secure']);

    $transport = $secure === 'ssl' ? "ssl://$host" : $host;
    $fp = @stream_socket_client("$transport:$port", $errno, $errstr, 15);
    if (!$fp) {
        throw new RuntimeException("Connection failed: $errstr ($errno)");
    }
    stream_set_timeout($fp, 15);

    $read = function () use ($fp): string {
        $data = '';
        while (($line = fgets($fp, 515)) !== false) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };
    $expect = function (string $resp, string $code): void {
        if (strpos($resp, $code) !== 0) {
            throw new RuntimeException("Unexpected SMTP reply: $resp");
        }
    };
    $cmd = function (string $command, string $code) use ($fp, $read, $expect): void {
        fwrite($fp, $command . "\r\n");
        $expect($read(), $code);
    };

    $expect($read(), '220');
    $ehlo = 'EHLO ' . (gethostname() ?: 'localhost');
    fwrite($fp, $ehlo . "\r\n");
    $expect($read(), '250');

    if ($secure === 'tls') {
        $cmd('STARTTLS', '220');
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('STARTTLS failed');
        }
        fwrite($fp, $ehlo . "\r\n");
        $expect($read(), '250');
    }

    if (!empty($mail['smtp_user'])) {
        $cmd('AUTH LOGIN', '334');
        $cmd(base64_encode((string) $mail['smtp_user']), '334');
        $cmd(base64_encode((string) $mail['smtp_pass']), '235');
    }

    $cmd('MAIL FROM:<' . $mail['from'] . '>', '250');
    $cmd('RCPT TO:<' . $to . '>', '250');
    $cmd('DATA', '354');

    $boundary = 'b' . bin2hex(random_bytes(8));
    $headers = "From: {$mail['from_name']} <{$mail['from']}>\r\n"
        . "To: <$to>\r\n"
        . 'Subject: ' . $subject . "\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
    $message = $headers . "\r\n"
        . "--$boundary\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n\r\n" . $text . "\r\n"
        . "--$boundary\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n\r\n" . $html . "\r\n"
        . "--$boundary--\r\n"
        . '.';
    $cmd($message, '250');
    fwrite($fp, "QUIT\r\n");
    fclose($fp);

    return true;
}
