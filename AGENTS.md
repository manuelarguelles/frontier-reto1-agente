# Contexto del proyecto Frontier Hackathon 2026

Lee `README.md` y `validation/pi-checks.json` al retomar. La memoria completa de esta sesión está en `/Users/macdenix/.codex/memories/frontier-hackathon-2026.md`.

Manuel participa remoto el 10 de octubre de 2026 y ya está unido al WhatsApp. Quiere trabajar desde Codex; Codex puede manejar pi por terminal y revisar el portal en un navegador visible. Ambos briefs estaban abiertos a las 09:47 y el reto seguía sin elegir: comprobar el estado actual.

## Modelos y método

Qwen3 Coder Next para código (predeterminado); DeepSeek V3.2 para análisis; Gemini 2.5 Flash para imágenes; Sonnet 4.6 para bloqueos difíciles. Codex selecciona según la tarea y cambia de modelo tras dos intentos sin avance. Verificar cambios y consumo. Seleccionar el modelo del agente entregado con pruebas locales cuando se conozca el brief.

## Credenciales y presupuesto

OpenRouter está configurado y verificado por Frontier. La key vive en el Llavero de macOS, servicio `frontier.lab10.ai.openrouter`, cuenta `frontier-hackathon`. No copiar credenciales al repo, memoria, logs ni respuestas. US$45 de trabajo; US$5 reservados por el organizador.

## Límites relevantes

Hora Lima/Bogotá: elegir reto entre 10:10 y 10:30; diseño de una página y diagrama hasta 12:00; incidente 15:30; ejecución hasta 20:00; debrief 20:00–21:00; demo 21:15–22:15. Tres evaluaciones ocultas durante el día y una corrida final adicional tras 20:00. Probar localmente antes de gastar evaluaciones. Reto 2 requiere especificación con evidencia del log.

Pi ya pasó pruebas básicas de lectura, edición, extracción y visión. No hay implementación del reto todavía. No elegir un reto ni enviar entregas sin autorización del usuario.

## Evidencia del kickoff

Consulta `docs/kickoff-analysis.md` para requisitos con marcas de tiempo, diferencias con el portal y decisiones D01–D08. El diseño no incluye implementar el reto; el repo de ejecución debe ser público y el entrypoint cumplir el contrato. Original e índice completo en `private/transcripts/`, ignorados por Git. No incorporar esa carpeta a una publicación. Las cantidades de ejemplos/casos y los horarios aproximados de la charla requieren confirmar el brief y calendario vigente.

## Contratos habilitados

Lee `docs/challenge-comparison.md` y `docs/challenge-contracts.json` antes de diseñar. Retos abiertos; elección hasta 10:30. Reto 1: tareas asíncronas aceptadas en menos de 2 segundos, límite 5 minutos y escritorio limpio. Reto 2: semántica exacta y reset; reemplazo no llama al original. El contrato dice hosting libre; el usuario informa servidor Railway asignado y propone staging propio. Falta confirmar función del servidor y obtener README del material. No se ha desplegado infraestructura.

Exploración de ambos retos e idea de Manuel OpenClaw/Playwright/VPS: `docs/design-exploration.md`. Railway confirmado: proyecto el-chambas con 2 servicios online, crédito US$4.28; no confundir con hopeful-solace. La idea de OpenClaw es candidata, no decisión aprobada ni implementación. Material/protocolo y compatibilidad con restricciones pendientes.
