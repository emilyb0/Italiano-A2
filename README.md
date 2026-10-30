# Italiano A2 · 14 días

App web para preparar un examen tipo **CILS A2** en 14 días (2–3 h diarias). Está pensada para hispanohablantes: la interfaz está en español y la práctica en italiano, con la traducción oculta hasta que la pidas.

Se hace con React + Vite + TypeScript + Tailwind. No tiene backend ni claves de API. El progreso se guarda en tu navegador (IndexedDB, con localStorage como respaldo) y la app se puede instalar como PWA para usarla sin conexión.

## Instalar y ejecutar

Necesitas Node.js 18 o superior.

```bash
npm install
npm run dev        # abre http://localhost:5173
```

Otros comandos:

```bash
npm test               # tests (SRS, comparador de respuestas y validación de contenido)
npm run check-content  # solo la validación del contenido
npm run build          # versión de producción en dist/
npm run preview        # sirve dist/ (aquí funciona la PWA offline)
```

> **Usa Chrome o Edge.** El reconocimiento de voz (Web Speech API) solo funciona bien ahí. En otros navegadores la app te avisa y puedes grabarte para autoevaluarte. Para que suenen bien las voces italianas, instala una voz it-IT en el sistema (en Windows: Configuración → Hora e idioma → Voz). Luego puedes elegirla en *Ajustes*.

> **OneDrive:** si la carpeta está sincronizada, `node_modules` (miles de archivos) puede hacer que la sincronización vaya lenta. Puedes excluir esa carpeta de OneDrive o mover el proyecto fuera.

## Cómo usarla

1. **Día 1:** haz la prueba diagnóstica (unos 15 min). Con ella se ajusta el plan.
2. **Hoy** te muestra los bloques del día, en este orden: repaso SRS (siempre primero), gramática nueva, vocabulario, escucha y shadowing, lectura, escritura u oral (en días alternos) y el cuaderno de errores. Ve marcando cada bloque al terminarlo.
3. **Días 10–12:** un simulacro completo cada día. **Día 13:** repites el simulacro en el que sacaste peor nota. **Día 14:** repaso de errores y práctica oral.
4. **Progreso** muestra tus horas de estudio, las palabras dominadas, la precisión por sección del examen, los temas débiles y una previsión de si estás lista.
5. En **Ajustes** puedes exportar o importar el progreso como JSON. Hazlo de vez en cuando como copia de seguridad.

## Estructura

```
src/
  content/        ← todo el contenido, en JSON por tipo
    vocab/        VocabItem[]      (≥400 palabras y frases)
    grammar/      GrammarNote[]    (explicación + drills para el SRS)
    lessons/      Unit (una unidad por archivo, con sus lecciones)
    reading/      ReadingText[]
    listening/    ListeningItem[]  (guiones que se leen con TTS)
    writing/      WritingTask[]
    oral/         { questions: OralQuestion[], monologues: MonologueTopic[] }
    pairs/        MinimalPair[]
    diagnostic/   Exercise[]       (con topic y section)
    exams/        Exam (un simulacro por archivo)
  lib/            lógica pura: srs, compare, cloze, speech, plan, stats, storage…
  store/          estado global (zustand) con guardado automático
  components/     UI y ejercicios
  pages/          pantallas
  test/           tests de vitest
```

Los tipos de todo el contenido están en `src/types.ts`.

## Añadir contenido

No hace falta tocar código: basta con crear o editar archivos JSON en `src/content/<tipo>/`. Todos los `.json` de cada carpeta se cargan automáticamente. Después ejecuta `npm run check-content`, que comprueba los ids, los índices de respuesta, la sintaxis de los huecos, el número de palabras de los textos modelo, etc.

**Vocabulario** (`vocab/*.json`):

```json
{ "id": "cib99", "it": "il carciofo", "es": "la alcachofa", "topic": "cibo", "ex": "Mi piacciono i carciofi.", "exEs": "Me gustan las alcachofas." }
```

`topic` tiene que ser uno de los temas de `VOCAB_TOPICS` (`src/lib/content.ts`). El `id` debe ser único. Cada palabra se convierte en una tarjeta SRS.

**Huecos (cloze)**, en lecciones y en la parte de *strutture*:

- `[[respuesta]]` o `[[resp1|resp2]]`: se escribe la respuesta (se aceptan alternativas).
- `[[correcta/opción2/opción3]]`: se elige una opción. **La primera es la correcta**; la app baraja el orden.

**Ejercicios de lección** (`lessons/unitNN.json` → `lessons[].exercises[]`). Los tipos disponibles son `translate`, `order`, `dictation`, `listen-choose`, `choice`, `cloze`, `match`, `speak`, `answer-oral`, `minimal-pair` y `teach`. Todos admiten `explain`: una regla breve en español que aparece al corregir.

```json
{ "type": "choice", "question": "Ieri ___ al cinema.", "options": ["sono andata", "ho andato", "sono andato"], "answer": 0, "explain": "andare → essere; concuerda con el sujeto." }
```

**Preguntas de lectura y escucha.** `{ "type": "choice", "q": "...", "options": [...], "answer": 0 }` o `{ "type": "vf", "q": "...", "answer": true }`. Para relacionar textos con títulos, usa `match: { left, right, answer }`, donde `answer[i]` es el índice en `right` que corresponde a `left[i]`.

**Simulacros:** copia `exams/exam1.json` y cambia el `id`. El plan de los días 10–12 usa los tres primeros simulacros.

## Técnicas incluidas

- **SRS (variante de SM-2).** Si fallas, la tarjeta vuelve a los 10 minutos y su facilidad baja. Si aciertas, los intervalos son 1 → 3 días → intervalo × facilidad, hasta un máximo de 60 días. Cada día se repasan primero las tarjetas que tocan y luego se añaden nuevas hasta el límite diario.
- **Recuerdo activo:** la mayoría de ejercicios son de producción (traducir, dictado, huecos, hablar).
- **Intercalado** de temas, con un repaso de lecciones anteriores en cada lección.
- **Feedback inmediato:** respuesta correcta, palabras marcadas y la regla en español.
- **Cuaderno de errores:** cada fallo crea una tarjeta SRS.
- **Shadowing y pares mínimos**, para las dobles consonantes, c/ch, g/gh, gl, gn y sc.
- **Simulador oral:** role play por voz con transcripción y checklist, y monólogo cronometrado.
- **Simulacros** con tiempos reales y nota por sección (aprobado ≥ 60 %).
- **Pomodoro 25/5.**

El contenido es original: no reproduce exámenes oficiales.
