<?php
date_default_timezone_set('America/Mexico_City');
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once 'jwt.php';

$conn = new mysqli("localhost", "root", "", "sistema_auth");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

$data          = json_decode(file_get_contents("php://input"), true);
$email         = trim($data['email']    ?? '');
$passwordInput = trim($data['password'] ?? '');
$ip            = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

if (!$email || !$passwordInput) {
    http_response_code(400);
    echo json_encode(["message" => "Datos incompletos"]);
    exit();
}

// ── BRUTE FORCE ───────────────────────────────────────────────
$maxIntentos = 5;

$stmtIntentos = $conn->prepare("
    SELECT COUNT(*) AS total FROM login_intentos
    WHERE email = ?
    AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
");
$stmtIntentos->bind_param("s", $email);
$stmtIntentos->execute();
$totalIntentos = $stmtIntentos->get_result()->fetch_assoc()['total'];

if ($totalIntentos >= $maxIntentos) {
    http_response_code(429);
    echo json_encode([
        "message"   => "Demasiados intentos fallidos. Espera 15 minutos.",
        "bloqueado" => true
    ]);
    exit();
}

// ── BUSCAR USUARIO ────────────────────────────────────────────
$stmt = $conn->prepare("
    SELECT u.id, u.nombre, u.email, u.password, u.role, u.status, r.nombre AS nombre_rol 
    FROM usuarios u
    INNER JOIN roles r ON r.id = u.role
    WHERE u.email = ?
");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
$user   = $result->fetch_assoc();

$credencialesValidas = $user && password_verify($passwordInput, $user['password']);
if ($credencialesValidas && $user['status'] === 'Inactivo') {
    http_response_code(403);
    echo json_encode(["message" => "Tu cuenta está bloqueada. Contacta al administrador."]);
    exit();
}
if (!$credencialesValidas) {
    $stmtLog = $conn->prepare("INSERT INTO login_intentos (email, ip) VALUES (?, ?)");
    $stmtLog->bind_param("ss", $email, $ip);
    $stmtLog->execute();

    $stmtCount = $conn->prepare("
        SELECT COUNT(*) AS total FROM login_intentos
        WHERE email = ?
        AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    ");
    $stmtCount->bind_param("s", $email);
    $stmtCount->execute();
    $totalActual = $stmtCount->get_result()->fetch_assoc()['total'];

    if ($totalActual >= $maxIntentos) {
        http_response_code(429);
        echo json_encode([
            "message"   => "Demasiados intentos fallidos. Espera 15 minutos.",
            "bloqueado" => true
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            "message"           => "Credenciales incorrectas",
            "intentosRestantes" => max(0, $maxIntentos - $totalActual)
        ]);
    }
    exit();
}

// ── LOGIN EXITOSO — limpiar intentos ──────────────────────────
$stmtLimpiar = $conn->prepare("DELETE FROM login_intentos WHERE email = ?");
$stmtLimpiar->bind_param("s", $email);
$stmtLimpiar->execute();

// ── INVALIDAR CÓDIGOS MFA ANTERIORES ─────────────────────────
$stmtInv = $conn->prepare("UPDATE mfa_codes SET usado = 1 WHERE usuario_id = ? AND usado = 0");
$stmtInv->bind_param("i", $user['id']);
$stmtInv->execute();

// ── GENERAR CÓDIGO MFA ────────────────────────────────────────
$codigo = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expira = date('Y-m-d H:i:s', strtotime('+10 minutes'));

$stmtCod = $conn->prepare("INSERT INTO mfa_codes (usuario_id, codigo, expira) VALUES (?, ?, ?)");
$stmtCod->bind_param("iss", $user['id'], $codigo, $expira);
$stmtCod->execute();

$stmtAcc = $conn->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?");
$stmtAcc->bind_param("i", $user['id']);
$stmtAcc->execute();

$respuesta = [
    "message"      => "Credenciales correctas. Verifica tu código MFA.",
    "mfaRequerido" => true,
    "usuarioId"    => $user['id'],
    "email"        => $user['email'],
];

if ($_SERVER['SERVER_NAME'] === 'localhost') {
    $respuesta['codigo_dev'] = $codigo;
}

echo json_encode($respuesta);

$conn->close();
?>