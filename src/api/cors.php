<?php
function aplicarCORS(): void {
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
}

// 👇 EJECUTAR
aplicarCORS();

// 👇 MANEJAR PREFLIGHT
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}