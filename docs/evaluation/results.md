# Resultados medidos (10 octubre 2026)

Golden set E1–E5, verificador `__check` del escritorio. Corridas individuales; ver [README.md](README.md) para la metodología. Registros crudos de la suite en `docs/validation/results-*.md`.

## Por modelo de actor

| Actor / versión | Resultado | Tiempos (s) | Coste |
| --- | --- | --- | --- |
| Sonnet 4.6 baseline | 5/5, `__check` en verde | E1 98–115, E2 85, E3 110, E4 90, E5 55 (fallida esperada) | ~US$0,2–0,4 por tarea |
| Sonnet 4.6 + zoom + verificador previo a `done` | Regresión: E3 fallida ("sin acciones válidas") | E3 225 | n/d |
| Haiku 5.5, suite v1 | 4/5 (E3 fallida por JSON truncado a 700 tokens) | n/d | n/d |
| Haiku 5.5, suite v2 (tope 1400 + escalada) | 3/5: E1 y E2 "conexión cerrada" (~57 s) por caídas VNC, no por el modelo; E3/E4/E5 ok | n/d | US$0,004–0,024 por tarea; suite completa US$0,048 |
| GPT-6 Luna | 5/5 | E1 110, E2 70, E3 65 (`respuesta: 45`), E4 75, E5 55 | suite completa US$0,042 |

Notas:

- La versión con zoom y verificador falló en E3 por zoom con parámetros inventados y un verificador sin contexto de las páginas previas. Ambos quedaron **opt-in**; el baseline no los usa.
- Prueba de caída forzada del socket en el paso 4 de E1 con Haiku: el agente reconectó y pasó `__check` (150 s).

## Latencia (`scripts/bench.ts`)

| Componente | Medido |
| --- | --- |
| Llamada al modelo | 2,2–4,8 s (Sonnet 2,2–4,1; Haiku 2,5–3,5; Luna 3,8–4,8) |
| Settle | 1,6 s |
| Clic | 0,19 s |
| Escribir 19 caracteres | 1,1 s |
| Captura | 0,17–0,37 s |
| PNG | 51 KB |

Paso típico 6–7 s; 10–17 pasos por tarea.

## Corrida oculta

1 de 56 tareas con Sonnet: ~2,1 min por tarea, ~US$0,13–0,16 por minuto medidos. La puntuación por categorías la reporta la plataforma y aún no está disponible; no se infiere de estas cifras.

## Lecciones

- **Bug de la suite (`c.paso` vs `c.pass`)**: la primera corrida marcó 0/5 con `__check` en ✗ aunque las respuestas eran correctas; era un error de campo en la suite, no del agente. Corregido y re-medido.
- **IDs de modelo inexistentes**: el catálogo por defecto de uno de los paquetes delegados usaba `claude-haiku-3.5` y `gemini-flash-1.5`, que no existen en OpenRouter; se detectó revisando la lista real de modelos de la API (no por las pruebas, que usaban mocks) y se corrigió antes de desplegar. Lección: validar los IDs contra la API real.
- **Tests dependientes de variables de entorno**: dieron resultados distintos según el entorno; se aislaron de él.
- **Cap de tokens en modelos con razonamiento**: 700 tokens truncaban el JSON (E3 en Haiku); se subió el tope a 1400 y se escala de modelo si la salida es ilegible.
- **Medir antes de añadir**: zoom y verificador parecían mejoras y regresaron E3; la suite lo detectó y quedaron opt-in.
- **Separar infraestructura de modelo**: las "conexión cerrada" se atribuyeron a VNC, y se añadió reconexión (hasta dos veces).
