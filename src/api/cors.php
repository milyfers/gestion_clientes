<?php
function aplicarCORS(): void {
    $permitidos = [
        'http://localhost:8100',  // Ionic dev
        'http://localhost:4200',  // Angular dev
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