# MTP Energía

Comparador de tarifas de luz con la marca de MTP Noticias. El usuario responde
**diez preguntas** sobre su casa y sus horarios y recibe las tarifas ordenadas
por coste anual estimado, con la fuente y la fecha de cada precio.

Vite + React + TypeScript + Tailwind. Sin backend, sin base de datos, sin
variables de entorno: todo el cálculo ocurre en el navegador.

```bash
npm install
npm run dev
npm run build      # typecheck + build de producción en dist/
```

Paleta y tipografía tomadas de mtpnoticias.com: rojo `#e11e25`, azul tinta
`#182e3e`, ámbar `#faab17`, Source Sans.

---

## 1. Cómo funciona

```
10 respuestas ──► expand.ts ──► 19 respuestas ──► profile.ts ──► recommend.ts
                     │                                  │              │
                     └─► supuestos (se muestran)        consumo        ranking
```

El motor de cálculo (`profile.ts`, `recommend.ts`, `billing.ts`, `tariffs.ts`,
`climate.ts`, `periods.ts`) es un modelo de 19 preguntas. Esta versión pregunta
10 y `src/lib/expand.ts` traduce esas 10 a las 19, por tres vías:

| Técnica | Ejemplo | Se pierde información |
| --- | --- | --- |
| **Fusionar** preguntas que eran una sola decisión | coche eléctrico + cuándo se carga → una pregunta | No |
| **Fusionar** preguntas cuyas combinaciones son raras | calefacción + agua caliente → "¿qué calientas con electricidad?" | Solo la combinación calefacción eléctrica con agua a gas |
| **Asumir** lo que menos pesa | cocina, aire acondicionado, placas solares, planta | Sí — y se dice |

**Ningún supuesto es silencioso.** Todo valor que `expand.ts` rellena en lugar
de leer se devuelve junto al resultado y se imprime en la página de resultados,
bajo *"Lo que hemos supuesto para no preguntarte"*, con qué hacer si no te
describe.

## 2. Verificación

Comprobado sobre **245.760 combinaciones** de respuestas (todas las opciones de
todas las preguntas, en cinco provincias de los cinco climas):

| Comprobación | Resultado |
| --- | --- |
| Errores o excepciones | 0 |
| Costes `NaN` o infinitos | 0 |
| Claves del motor sin rellenar | 0 |
| Diferencias con el modelo completo de 19 preguntas, al céntimo | **0** |

Y cada pregunta cambia la tarifa recomendada en una parte real de los hogares
— cambiando **solo** esa respuesta, todo lo demás igual:

| Pregunta | Hogares en los que cambia la recomendación |
| --- | --- |
| Prioridad | 99,6 % |
| Vehículo eléctrico | 95,8 % |
| Qué calientas con electricidad | 51,3 % |
| Franjas en casa | 50,4 % |
| Potencia contratada | 42,2 % |
| Vivienda | 28,8 % |
| Puedes programar electrodomésticos | 26,2 % |
| Personas | 17,1 % |
| Provincia | 17,0 % |

La factura mensual no altera el ranking por diseño: es el ancla con la que se
compara la estimación contra lo que el usuario dice que paga. Llegan a
recomendarse **9 tarifas distintas** según el perfil.

## 3. De dónde salen los precios

`src/lib/tariffs.ts`: 13 tarifas de 10 comercializadoras. Cada fila lleva su
URL de origen y la fecha en que **alguien abrió esa página** (`checked`). Si una
cifra no se ha leído en su fuente, no entra.

- 8 de 13 tienen el precio leído en la web de la propia comercializadora.
- 5 siguen en agregadores (Octopus ×2, Holaluz, Repsol, Niba). De los precios
  contrastados en origen, varios estaban mal en el agregador: hay que asumir
  que alguno de estos 5 también.
- La fuente que corresponde es el comparador de la CNMC
  (`comparador.cnmc.gob.es`), con presentación obligatoria y verificación
  previa. No tiene API pública: se solicita a `info.comparador@cnmc.es`.

**Los precios caducan.** El mercado se reprecia a menudo. Revisa `tariffs.ts`
antes de cada despliegue importante.

## 4. Límites conocidos

- **Solo península y Baleares.** Canarias, Ceuta y Melilla tributan por IGIC e
  IPSI y tienen sistemas eléctricos separados.
- El consumo es una **estimación**, no una medición. Datadis publica la curva
  horaria real de cada suministro; integrarla haría sobrar el modelo.
- Los impuestos (`REGULATED` en `billing.ts`) se comprobaron en octubre de 2026.
  Cambiaron varias veces entre 2021 y 2024: verifícalos.
- El término de potencia nocturno (P2) de las filas de agregador es un valor
  provisional común.
- Una sola prioridad: quien elige "renovable" no queda filtrado también por
  permanencia. Se avisa en resultados.

## 5. Despliegue

Sin `vercel.json`, a propósito: Vercel detecta Vite y usa por defecto
`npm run build` y la carpeta `dist/`, que es justo lo que hace falta. La app no
tiene rutas (es una sola página), así que no necesita reglas de reescritura.
Una versión anterior llevaba una y Vercel la rechazó como `vercel.json` no
válido. No necesita variables de entorno.
