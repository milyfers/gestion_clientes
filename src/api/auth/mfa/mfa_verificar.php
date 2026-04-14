<?php
date_default_timezone_set('America/Mexico_City'); 
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../jwt.php';
require_once '../config.php'; 
aplicarCORS();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}
$data      = json_decode(file_get_contents("php://input"), true);
$usuarioId = (int) ($data['usuarioId'] ?? 0);
$codigo    = trim($data['codigo'] ?? '');
error_log("usuarioId: $usuarioId | codigo: '$codigo' | longitud: " . strlen($codigo));
// Validar formato antes de tocar la BD
if (!$usuarioId || !$codigo) {
    http_response_code(400);
    echo json_encode(["message" => "Datos incompletos"]);
    exit();
}

if (!preg_match('/^\d{6}$/', $codigo)) {
    http_response_code(400);
    echo json_encode(["message" => "Formato de código inválido"]);
    exit();
}

// ── BUSCAR CÓDIGO VÁLIDO ──────────────────────────────────────
$stmt = $conn->prepare("
    SELECT id FROM mfa_codes
    WHERE usuario_id = ?
      AND codigo = ?
      AND usado = 0
      AND expira > NOW()
    ORDER BY created_at DESC
    LIMIT 1
");
$stmt->bind_param("is", $usuarioId, $codigo);
$stmt->execute();
$result = $stmt->get_result();
error_log("Filas encontradas: " . $result->num_rows);
if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(["message" => "Código inválido o expirado"]);
    exit();
}

$mfaId = $result->fetch_assoc()['id'];

// ── MARCAR CÓDIGO COMO USADO ──────────────────────────────────
$stmtUp = $conn->prepare("UPDATE mfa_codes SET usado = 1 WHERE id = ?");
$stmtUp->bind_param("i", $mfaId);
$stmtUp->execute();

// ── OBTENER DATOS DEL USUARIO ─────────────────────────────────
$stmtUser = $conn->prepare("
    SELECT u.id, u.nombre, u.email, u.role, u.status, r.nombre AS nombre_rol 
    FROM usuarios u
    INNER JOIN roles r ON r.id = u.role
    WHERE u.id = ?
");
$stmtUser->bind_param("i", $usuarioId);
$stmtUser->execute();
$user = $stmtUser->get_result()->fetch_assoc();

if ($user['status'] === 'Inactivo') {
    http_response_code(403);
    echo json_encode(["message" => "Tu cuenta está bloqueada. Contacta al administrador."]);
    exit();
}

// ── GENERAR TOKENS ────────────────────────────────────────────
$accessToken  = JWT::generar([
    'id'    => $user['id'],
    'email' => $user['email'],
    'role'  => $user['nombre_rol'] 
], 900); // 15 minutos

$refreshToken  = bin2hex(random_bytes(32));
$expiraRefresh = date('Y-m-d H:i:s', strtotime('+7 days'));
$expiraSes     = date('Y-m-d H:i:s', strtotime('+7 days'));
$ip            = $_SERVER['REMOTE_ADDR']     ?? 'unknown';
$userAgent     = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

// ── GUARDAR REFRESH TOKEN EN TABLA DEDICADA ───────────────────
// ── GUARDAR REFRESH TOKEN EN TABLA DEDICADA ───────────────────
$stmtRefresh = $conn->prepare("
    INSERT INTO refresh_tokens (usuario_id, token, expira, ip, user_agent)
    VALUES (?, ?, ?, ?, ?)
");
if (!$stmtRefresh) {
    http_response_code(500);
    echo json_encode(["message" => "Error refresh prepare: " . $conn->error]);
    exit();
}
$stmtRefresh->bind_param("issss", $user['id'], $refreshToken, $expiraRefresh, $ip, $userAgent);
if (!$stmtRefresh->execute()) {
    http_response_code(500);
    echo json_encode(["message" => "Error refresh execute: " . $stmtRefresh->error]);
    exit();
}

// ── GUARDAR SESIÓN ACTIVA ─────────────────────────────────────
$stmtSes = $conn->prepare("
    INSERT INTO sessions (usuario_id, token, ip, user_agent, expira)
    VALUES (?, ?, ?, ?, ?)
");
if (!$stmtSes) {
    http_response_code(500);
    echo json_encode(["message" => "Error sessions prepare: " . $conn->error]);
    exit();
}
$stmtSes->bind_param("issss", $user['id'], $refreshToken, $ip, $userAgent, $expiraSes);
if (!$stmtSes->execute()) {
    http_response_code(500);
    echo json_encode(["message" => "Error sessions execute: " . $stmtSes->error]);
    exit();
}
// ── ACTUALIZAR ÚLTIMO ACCESO ──────────────────────────────────
$stmtAcceso = $conn->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?");
$stmtAcceso->bind_param("i", $user['id']);
$stmtAcceso->execute();

// ── RESPUESTA ─────────────────────────────────────────────────
echo json_encode([
    "message"      => "MFA verificado correctamente",
    "accessToken"  => $accessToken,
    "refreshToken" => $refreshToken,
    "user"         => [
        "id"     => $user['id'],
        "nombre" => $user['nombre'],
        "email"  => $user['email'],
        "role"   => $user['nombre_rol']
    ]
]);

$conn->close();
?>