# Academia Ignacio Torchi — rediseño para revisión

Landing estática del repositorio existente `web-curso`. Conserva `CNAME` y los productos y pagos de Tiendup. Esta rama no publica cambios en producción hasta su integración en la rama que despliega el sitio.

## Editar y previsualizar

- `site.config.json`: precios ARS y USD independientes, URLs de productos, medios de pago, reseñas, preguntas frecuentes, imágenes y medición.
- `src/index.template.html`: estructura y textos generales.
- `academy.css`: presentación y adaptación a celulares.
- `academy.mjs`: interacciones, consentimiento y medición.
- `commerce.mjs`: moneda, formato y atribución de campañas.
- Ejecutar `npm run build` después de modificar la configuración o plantilla. Versionar también el `index.html` generado: el hosting sirve ese archivo directamente.
- `npm run dev` sirve una vista local en http://127.0.0.1:4178. No necesita instalar dependencias; utiliza Node. `npm test` ejecuta las comprobaciones.
- `scripts/optimize-images.py` requiere Pillow solamente si se regeneran imágenes. Los WebP ya están preparados. Las imágenes originales permanecen intactas.

## Precios y compra

Valores consultados en los productos de Tiendup el 25/10/2026:

| Curso | ARS | USD |
| --- | ---: | ---: |
| Photoshop desde cero | 31.050 | 31,00 |
| Photoshop + Flyers | 55.300 | 55,30 |
| Flyers Deportivos | 35.600 | 35,60 |

No existe sincronización automática de precios: actualizar ambos importes en `courses[].prices` cuando cambien en Tiendup y volver a construir. No se calcula un tipo de cambio.

Sin preferencia previa, ipwho.is determina país aproximado: AR usa ARS; otros países o fallo de red usan USD. La selección manual se conserva y tiene prioridad incluso si la respuesta de país llega más tarde. No se solicita GPS.

Los botones llevan a las URLs reales de producto. No hay un enlace de checkout ni un parámetro de moneda verificados; por eso se explica que la moneda debe elegirse nuevamente en Tiendup. Mercado Pago y transferencia corresponden a ARS; PayPal y Binance a USD. La landing no cobra ni modifica productos.

## Medición

Se conserva el identificador GA4 anterior `G-11414884467`, con carga posterior al consentimiento y únicamente en `cursos.ignaciotorchi.com`. La recepción de eventos en esa propiedad no fue comprobada. Las vistas locales no envían eventos.

Eventos implementados: `buy_click`, `select_item` en enlaces de temario, `view_item` cuando se ve una tarjeta, `currency_select`, `recommendation_select`, `whatsapp_click` y `free_sample_click`. No se emiten `begin_checkout` ni `purchase`: requieren integración confirmada del checkout de Tiendup.

Para GTM, elegir `analytics.mode: "gtm"` y configurar `gtmId`; no instalar GA4 directo además del contenedor. El contenedor debe respetar consentimiento y no duplicar etiquetas. Para Meta, completar `metaPixelId` y revisar el aviso de privacidad antes de activarlo. Ambos identificadores están vacíos: no se inventaron cuentas.

Las cinco UTMs estándar se conservan en enlaces de cursos. Se excluyen parámetros ajenos y valores que parezcan correos. Persistencia de atribución por sesión sólo al aceptar medición. Ejemplo para campañas: `?utm_source=instagram&utm_medium=organic_social&utm_campaign=cursos&utm_content=reel_photoshop`. Cambiar `utm_content` por `story_combo`, `bio` u otra pieza identificable; no incluir datos personales.

## Recursos y contenido

Se usan diseños y retrato reales del repositorio. Galería ampliable con originales y WebP responsive para el contenido inicial. Reseñas breves copiadas de la página pública de opiniones de Flyers, con enlace a su fuente. Sin cifras de alumnos, temporizadores, certificaciones ni promesas de ingresos no verificadas.

`media.instructorVideo` queda vacío hasta tener un archivo real autorizado. `media.studentWork` admite objetos `{ "src": "...", "alt": "...", "authorized": true }`: se oculta mientras no haya recursos aprobados. No se sustituyeron por trabajos ficticios. Confirmar la duración de acceso de Flyers y del combo con Tiendup antes de añadir una promesa de acceso vitalicio; sólo Photoshop lo explicita en su ficha.

## Validación y límites

- Pruebas automatizadas: monedas y precedencia manual, precios independientes, atribución de enlaces, contenido HTML inicial y anclas, conservación del dominio.
- Revisión visual en navegador a 1200 px y 390 px; ancho móvil real de contenido 375 px sin desborde horizontal. Monedas sincronizadas y persistentes tras recarga; menú móvil, recomendaciones, FAQ y lightbox con Escape comprobados.
- Precios y destinos comerciales contrastados con fichas públicas. No se realizó ninguna transacción.
- No se probó en un teléfono físico ni en el navegador interno de Instagram. No se ejecutó Lighthouse ni se afirma una puntuación de rendimiento.
- Pendiente tras publicar: comprobar geolocalización desde países reales, GA4 DebugView/Realtime, indexación y vista previa social. Verificar compras en Tiendup por separado si se desea medir conversiones reales.

La estructura HTML incluye contenido sin depender de JavaScript, enlaces navegables, textos alternativos, salto al contenido, foco visible, controles nativos, movimiento reducido, canonical, Open Graph y sitemap. El selector dinámico requiere JavaScript; sin él se muestran precios USD y enlaces funcionales.
