# Plan de Implementación: Streaming SSE y Respaldo Inteligente de Modelos (Completado)

Implementación completada con éxito para la optimización de latencia, streaming y respaldo inteligente en Newton AI.

---

## Estado de Ejecución

- [x] **Inspección de Errores HTTP del SDK**: Códigos extraídos directamente desde `err.status`, `err.statusCode` y `err.error?.code`.
- [x] **Respaldo con Timeouts Escalonados**: 15 s en `gemini-3.8-flash` y 20 s en `gemini-3.1-flash-lite`, relevo únicamente antes del primer chunk ante 404, 429, 500, 502, 503, 504 o timeout.
- [x] **Cancelación Limpia con AbortController**: Detecta desconexiones del cliente en `req.on('close')` y aborta la llamada activa.
- [x] **Streaming SSE en `/api/chat`**: Implementado con `generateContentStream` y cabeceras `text/event-stream`.
- [x] **Ocultamiento de Tokens de Control**: Supresión en tiempo real de `[DIAGRAMA]:` y `[SUGERENCIAS]:`, emitiendo metadatos estructurados en el evento final `done`.
- [x] **Cliente Optimizado**: Consumo con `ReadableStream`, agrupación de re-renders de KaTeX/Markdown con `requestAnimationFrame` y scroll `auto` durante streaming.
- [x] **`/api/vision` Preservado**: Mantiene flujo estructurado sin streaming.
