<?php
date_default_timezone_set('America/Mexico_City');

// ✅ CORS primero - antes de TODO
$permitidos = [
    'http://localhost:8100',
    'http://localhost:4200',
    'https://gestionclientes-production-3857.up.railway.app',
];

$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origen, $permitidos)) {
    header("Access-Control-Allow-Origin: $origen");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// ✅ OPTIONS preflight aquí, antes de cualquier lógica
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

// ✅ Mismo path que login.php (ajusta los niveles según tu estructura real)
require_once __DIR__ . '/../../jwt.php';
require_once __DIR__ . '/../../config.php';

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

$data      = json_decode(file_get_contents("php://input"), true);
$usuarioId = (int) ($data['usuarioId'] ?? 0);
$codigo    = trim($data['codigo'] ?? '');

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
$accessToken = JWT::generar([
    'id'    => $user['id'],
    'email' => $user['email'],
    'role'  => $user['nombre_rol']
], 900); // 15 minutos

$refreshToken  = bin2hex(random_bytes(32));
$expiraRefresh = date('Y-m-d H:i:s', strtotime('+7 days'));
$expiraSes     = date('Y-m-d H:i:s', strtotime('+7 days'));
$ip            = $_SERVER['REMOTE_ADDR']     ?? 'unknown';
$userAgent     = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

// ── GUARDAR REFRESH TOKEN ─────────────────────────────────────
$stmtRefresh = $conn->prepare("
    INSERT INTO refresh_tokens (usuario_id, token, expira, ip, user_agent)
    VALUES (?, ?, ?, ?, ?)
");
$stmtRefresh->bind_param("issss", $user['id'], $refreshToken, $expiraRefresh, $ip, $userAgent);
$stmtRefresh->execute();

// ── GUARDAR SESIÓN ACTIVA ─────────────────────────────────────
$stmtSes = $conn->prepare("
    INSERT INTO sessions (usuario_id, token, ip, user_agent, expira)
    VALUES (?, ?, ?, ?, ?)
");
$stmtSes->bind_param("issss", $user['id'], $refreshToken, $ip, $userAgent, $expiraSes);
$stmtSes->execute();

// ── ACTUALIZAR ÚLTIMO ACCESO ──────────────────────────────────
$stmtAcceso = $conn->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?");
$stmtAcceso->bind_param("i", $user['id']);
$stmtAcceso->execute();

// ── RESPUESTA ─────────────────────────────────────────────────
$respuesta = [
    "message"      => "MFA verificado correctamente",
    "accessToken"  => $accessToken,
    "refreshToken" => $refreshToken,
    "user"         => [
        "id"     => $user['id'],
        "nombre" => $user['nombre'],
        "email"  => $user['email'],
        "role"   => $user['nombre_rol']
    ]
];

// ✅ En desarrollo muestra el código (igual que login.php)
if ($_SERVER['SERVER_NAME'] === 'localhost') {
    $respuesta['debug'] = "MFA verify OK para usuario ID: " . $user['id'];
}

echo json_encode($respuesta);

$conn->close();
?>