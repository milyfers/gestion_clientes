<?php
require_once __DIR__ . '/jwt.php';

function verificarToken(): array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(["message" => "Token requerido"]);
        exit();
    }

    $token = substr($authHeader, 7);
    $resultado = JWT::verificar($token);

    if (!$resultado['valido']) {
        http_response_code(401);
        echo json_encode(["message" => "No autorizado: " . $resultado['error']]);
        exit();
    }

    // ── Verificar status del usuario en BD ────────────────────
    require_once __DIR__ . '/config.php';
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if (!$conn->connect_error) {
        $userId = (int) $resultado['data']['id'];
        $stmt = $conn->prepare("SELECT status FROM usuarios WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $conn->close();

        if ($user && $user['status'] === 'Inactivo') {
            http_response_code(403);
            echo json_encode(["message" => "Cuenta bloqueada"]);
            exit();
        }
    }

    return $resultado['data'];
}

function verificarRol(array $payload, array $rolesPermitidos): void {
    if (!isset($payload['role']) || !in_array($payload['role'], $rolesPermitidos)) {
        http_response_code(403);
        echo json_encode(["message" => "Acceso denegado: rol insuficiente"]);
        exit();
    }
}

function verificarRateLimit(mysqli $conn, string $ip, string $ruta, int $maxPorMinuto = 60): void {
    $stmt = $conn->prepare("
        SELECT COUNT(*) AS total FROM rate_limit
        WHERE ip = ? AND ruta = ?
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    ");
    $stmt->bind_param("ss", $ip, $ruta);
    $stmt->execute();
    $total = $stmt->get_result()->fetch_assoc()['total'];

    if ($total >= $maxPorMinuto) {
        http_response_code(429);
        echo json_encode(["message" => "Demasiadas peticiones. Intenta más tarde."]);
        exit();
    }

    $stmtLog = $conn->prepare("INSERT INTO rate_limit (ip, ruta) VALUES (?, ?)");
    $stmtLog->bind_param("ss", $ip, $ruta);
    $stmtLog->execute();
}