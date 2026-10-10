# Comparación offline de grounding — 11:48, 10 octubre 2026

Sobre una captura existente de El Faro (1280x800), bbox manuales guardadas antes
de las llamadas; los modelos no recibieron respuestas ni bbox. Sin herramientas,
sin ejecución de clics y sin modificaciones a SIGECOM.

- Sonnet4.6: Dirección [688,247], Guardar [66,399], Volver [144,399], todos dentro
  de sus controles anotados. Eliminar cliente ausente: se abstuvo correctamente.
  3/3 positivos +1/1 negativo sobre esta única imagen. Coste US$0.00923025.
- Gemini2.5Flash: recorte520x160 en offset[430,170], Dirección[284,99] local,
  convertido a[714,269] original; fuera del campo y236–258. No ejecutado.
  Coste US$0.00065150. El recorte solo no resolvió el fallo de esta muestra.

Registro: validation/grounding-v2.json. Imágenes y salidas originales privadas en
artifacts/. Esto apoya Sonnet baseline de actuación y evaluar alternativas después;
no demuestra tasa poblacional, rapidez de navegación ni tareas completas. La
captura ya era conocida en otras pruebas, y no es un set independiente oculto.
