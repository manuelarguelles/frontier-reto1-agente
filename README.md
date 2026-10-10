# Frontier Hackathon 2026

Proyecto de Manuel Argüelles para Frontier, 10 de octubre de 2026. Modalidad remota.

## Estado

Reto 1 elegido y confirmado a las 10:23. Material disponible en private/challenge-1/. Entorno SIGECOM 1280×800, solo VNC/RFB. Ver docs/challenge-1-selected.md. No hay implementación del agente todavía.

## Reglas del evento

- Elección del reto: 10:10–10:30; no se puede cambiar.
- Diseño individual: una página y diagrama, hasta las 12:00; peso 30%.
- Ejecución: repo, entrypoint y video de 2 minutos, hasta las 20:00; peso 40%.
- Incidente a las 15:30.
- Tres corridas del set oculto durante el día y una corrida final tras las 20:00 sobre la última entrega a tiempo.
- Debrief individual de 10 minutos: 20:00–21:00; peso 15%.
- Demo: 21:15–22:15; peso 15%.
- Para Reto 2: especificación y log, con evidencia por comportamiento.
- Presupuesto de trabajo: US$45; reserva del organizador para evaluaciones: US$5.

## Herramientas

Pi 1.1.0 instalado; OpenRouter verificado por Frontier. La credencial vive en el Llavero de macOS, fuera del repo.

## Método de trabajo

| Modelo | Uso principal |
|--------|---------------|
| Qwen3 Coder Next | Código |
| DeepSeek V3.2 | Análisis |
| Gemini 2.5 Flash | Imágenes |
| Claude Sonnet 4.6 | Bloqueos difíciles |

Codex coordina la selección según la tarea. Tras dos intentos sin avance cambia de modelo, y revisa los resultados y consumo. El modelo del agente entregado se elegirá con pruebas locales cuando salga el brief.

## Avance de kickoff

[Análisis, índice por temas y decisiones](docs/kickoff-analysis.md), basado en el avance 00:00–32:32. Diseño individual sin implementar el reto; ejecución con repo público y entrypoint desplegado según contrato. Original e índice detallado permanecen en `private/transcripts/`, fuera de Git.

## Retos habilitados

[Comparación y plan portable de despliegue](docs/challenge-comparison.md), con [contratos estructurados](docs/challenge-contracts.json). Ambas series de pestañas revisadas; README de Reto 1 descargado y revisado. Propuesta: validar en Railway propio y desplegar el mismo commit en el destino del organizador cuando se conozca.

## Diseño listo para revisión

[Diseño de una página](output/pdf/reto-1-diseno.pdf), [diagrama](output/pdf/reto-1-arquitectura.pdf) y [plan de validación](docs/design/validation-plan.md). [Exploración visual real y límites](docs/design/desktop-evidence.md). Nueve delegaciones Pi, coste US$0.02520; una acción Sonnet ejecutada y verificada, Gemini requiere mejorar coordenadas. No enviados al portal; cero corridas ocultas usadas. Implementación comienza tras diseño, a las 12:00.
