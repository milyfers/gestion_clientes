<?php
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../config.php';
require_once '../auth_middleware.php';
aplicarCORS();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

verificarToken();

$stmt = $conn->prepare("
    SELECT id, nombre, es_sistema,
           COALESCE(descripcion, '') AS descripcion
    FROM roles
    ORDER BY id ASC
");
$stmt->execute();
$result = $stmt->get_result();

$roles = [];
while ($row = $result->fetch_assoc()) {
    $row['id']         = (int)  $row['id'];
    $row['es_sistema'] = (bool) $row['es_sistema'];
    $roles[] = $row;
}

echo json_encode($roles);
$conn->close();
?>