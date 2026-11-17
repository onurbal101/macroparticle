# Architecture

## Data and validation

`src/data/knowledge.json` contains the source registry, model metadata, power levels, 12 controls and 71 records. Records include 42 presets, 9 manual instructions, 10 other operational functions and 10 reference articles.

Each food retains the official Turkish name, application titles in both languages, its parent function, full code, hierarchy, quantity representation, cookware/accessories, preparation, machine-readable actions, warnings, standing and source pages. English official-name fields remain null because the English regional tables differ. An explicit translation status is supplied.

Quantities have three forms. A fixed quantity or interval belongs to an Auto Cook code. Options are discrete values from the Healthy Steam table. A defrost range has a documented minimum and maximum. An unknown increment is represented by null. The simulator uses the reported 100 g step for chicken and uses that as its default for the other defrost programmes.

Every action identifies its type, physical control, value or parameter, optional expected display, phase and any special message. Group and food confirmation use Select/Clock. Rotary actions use the dial. The action formatter produces both interface languages from the same sequence. Original displays are stated only where documented, such as Child Lock L.

Zod validates references, duplicate IDs/codes, controls, dial actions, confirmation, power and minimum preset completeness. Code uniqueness uses the parent function. The validation script also checks counts against the reviewed manual and matching print coverage.

## Presentation

React and TypeScript run on Vite with Tailwind CSS. BrowserRouter supports direct program and control URLs. The main destinations are Programs, Simulation, Guide and Account. Search opens in a separate dialog. The programme guide highlights the current step on a read-only panel. Simulation uses an interactive panel and shares the preparation content.

Turkish is the default. Interface strings live in `src/i18n.ts`. Knowledge text uses explicit Turkish/English fields. Hardware names are taken from the panel diagram. The panel drawing keeps four paired rows, the dial with its separate right-hand confirmation key, and the two bottom controls.

Search builds an index from the same records and controls. It normalizes Turkish dotted and dotless I, diacritics and punctuation. It matches phrases, tokens and bounded Damerau-Levenshtein edits. Result types distinguish presets, manual instructions, functions, controls and articles.

## Local state and offline access

Language, theme, favorites, six recent records and personal notes use `microwave-companion-v1` in local storage. A schema supplies defaults for older saved fields. Invalid JSON and missing record IDs are handled. A failed storage write produces visible feedback while the current session remains usable.

The Vite PWA plugin generates a root-scoped service worker. It precaches app code, local fonts, icons, print files and the SPA shell. All operational data is inside the app bundle. Original source websites and PDFs are online resources. The update prompt activates a waiting worker when the user accepts it.

## Print pipeline

`scripts/print.ts` imports the runtime-validated data, checks the production origin, generates QR SVGs/PNGs and decodes each image at 600 and 220 pixels. It generates an original panel SVG, then sends the records to `scripts/print_pdf.py`. ReportLab creates the A5 card, A4 full index and A5 legend using bundled Turkish-capable fonts. Each preset has a direct PDF link to its PWA record. Category QR codes open the matching function.

The generated manifest captures the knowledge version, every preset ID and the QR destinations. Print generation checks the encoded URLs. HTTP checks are part of release verification. Public PDFs are duplicated into `output/pdf/` for local delivery. Build copies them into the deployable static app and the offline cache.
