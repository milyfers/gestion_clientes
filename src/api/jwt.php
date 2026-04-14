<?php
class JWT {

    private static $secret = 'mi_clave_super_secreta_2026';
    private static $algoritmo = 'SHA256';

    private static function getSecret(): string {
    return defined('JWT_SECRET') ? JWT_SECRET : 'fallback_secret';
    }

    // ── GENERAR TOKEN ─────────────────────────────────────────
    public static function generar(array $payload, int $expiracion = 900): string {
        // Header
        $header = self::base64url(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        // Payload con tiempos
        $payload['iat'] = time();
        $payload['exp'] = time() + $expiracion;

        $payloadEncoded = self::base64url(json_encode($payload));

        // Firma
        $firma = self::base64url(hash_hmac(
            self::$algoritmo,
            "$header.$payloadEncoded",
            self::getSecret(),
            true
        ));

        return "$header.$payloadEncoded.$firma";
    }

    // ── VERIFICAR TOKEN ───────────────────────────────────────
    public static function verificar(string $token): array {
        $partes = explode('.', $token);

        if (count($partes) !== 3) {
            return ['valido' => false, 'error' => 'Token malformado'];
        }

        [$header, $payload, $firma] = $partes;

        // Verificar firma
        $firmaEsperada = self::base64url(hash_hmac(
            self::$algoritmo,
            "$header.$payload",
            self::getSecret(),
            true
        ));

        if (!hash_equals($firmaEsperada, $firma)) {
            return ['valido' => false, 'error' => 'Firma inválida'];
        }

        // Decodificar payload
        $data = json_decode(self::base64urlDecode($payload), true);

        // Verificar expiración
        if (isset($data['exp']) && $data['exp'] < time()) {
            return ['valido' => false, 'error' => 'Token expirado'];
        }

        return ['valido' => true, 'data' => $data];
    }

    // ── UTILIDADES ────────────────────────────────────────────
    private static function base64url(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
?>