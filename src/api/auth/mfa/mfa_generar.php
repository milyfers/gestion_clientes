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

// ✅ OPTIONS preflight antes de cualquier lógica
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");
require_once __DIR__ . '/../../config.php';

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

$data      = json_decode(file_get_contents("php://input"), true);
$usuarioId = (int) ($data['usuarioId'] ?? 0);

if (!$usuarioId) {
    http_response_code(400);
    echo json_encode(["message" => "Usuario requerido"]);
    exit();
}

// Verificar que el usuario existe
$stmt = $conn->prepare("SELECT id, email, nombre FROM usuarios WHERE id = ?");
$stmt->bind_param("i", $usuarioId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["message" => "Usuario no encontrado"]);
    exit();
}

$user = $result->fetch_assoc();

// Invalidar códigos anteriores
$stmtInv = $conn->prepare("UPDATE mfa_codes SET usado = 1 WHERE usuario_id = ? AND usado = 0");
$stmtInv->bind_param("i", $usuarioId);
$stmtInv->execute();

// Generar código de 6 dígitos
$codigo = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expira = date('Y-m-d H:i:s', strtotime('+10 minutes'));

// Guardar en BD
$stmtCod = $conn->prepare("INSERT INTO mfa_codes (usuario_id, codigo, expira) VALUES (?, ?, ?)");
$stmtCod->bind_param("iss", $usuarioId, $codigo, $expira);
$stmtCod->execute();

$respuesta = [
    "message"   => "Código enviado al correo " . $user['email'],
    "usuarioId" => $usuarioId,
    "email"     => $user['email'],
];

// Solo en desarrollo
if ($_SERVER['SERVER_NAME'] === 'localhost') {
    $respuesta['codigo_dev'] = $codigo;
}

echo json_encode($respuesta);

$conn->close();
?>