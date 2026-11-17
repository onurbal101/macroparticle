# Microwave Companion

A Turkish-first, offline PWA for the Samsung MS23K3555ES/ND solo microwave. The app includes English translations, all 42 verified automatic programs, manual reheating guidance, an interactive control panel, local bookmarks and notes, and printable references.

The app and the print QR destinations use [macroparticle.onurbal.com](https://macroparticle.onurbal.com).

## Run locally

Use Node.js 22.12 or later. Node.js 26 was used for this build.

```sh
npm ci
npm run dev
```

The development server prints its local URL. The service worker is enabled in the production build. To test offline use, run the following commands.

```sh
npm run build
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173`. Install from the browser menu with Add to Home Screen or Install App. On iOS, use Safari's Share menu. The app stores language, theme, favorites, recently viewed records and notes in browser local storage. Browser storage removal also removes these preferences.

## Verify

```sh
npm test
npm run validate
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests check the complete code and quantity tables, source validation, control actions, reheating variants, Turkish normalization, typo tolerance and old or damaged local storage. Playwright covers task navigation, source-backed steps, portions, defrost interaction, persistence, English, offline reload and PDFs, direct links, responsive overflow, screenshots and automated WCAG AA checks.

Visual baselines are in `tests/e2e/app.spec.ts-snapshots`. To update them after a reviewed design change, run `npx playwright test --update-snapshots`, inspect the resulting images and run the tests again.

Browser coverage uses desktop Chromium and a mobile Chromium viewport. Actual phone installation, appliance operation and physical paper scans require device checks.

## Print references

Ready-made PDF files are in `output/pdf/` and `public/print/`.

- `everyday-card.pdf` has two A5 landscape sides. Print at 100% size. For a landscape flip, use short-edge duplex and check the printer preview.
- `preset-index.pdf` is an eight-page A4 landscape index. It contains all 42 presets, their hierarchy, quantities, preparation, standing, warnings, direct links and source pages.
- `button-legend.pdf` is an A5 landscape control reference.

The panel drawing is simplified. Control positions follow Turkish manual p. 11. English hardware labels are preserved. Symbols are simplified, and the separate Select/Clock key stays to the right of the rotary dial.

Keep references in a separate stand, on a refrigerator, or in another safe place. Keep the vents, door and controls clear.

To regenerate the PDFs, install the Python print dependencies. Noto Sans fonts and their OFL license are bundled under `assets/fonts/`.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-print.txt
PRINT_PYTHON=.venv/bin/python PUBLIC_BASE_URL=https://macroparticle.onurbal.com npm run print
npm run validate
npm run build
```

`PUBLIC_BASE_URL` must be an HTTPS origin. The script creates six SVG/PNG QR codes and decodes each at two raster sizes. The generated manifest records destinations, the data version and all 42 preset IDs. It also writes an original panel SVG. Change the origin and repeat these commands when the domain changes.

To regenerate app icons, run `python3 scripts/icons.py` in a Python environment with Pillow.

## Knowledge and source review

`src/data/knowledge.json` is the canonical dataset for the app, search, instructions and print index. Zod validates it at runtime and during print generation. All English food and instruction text is labeled as an application translation of the Turkish regional manual. Separate regional English documentation has a different steam 2-6 food.

- [Source registry](docs/SOURCES.md)
- [Manual coverage audit](docs/MANUAL_AUDIT.md)
- [Feature inventory](docs/FEATURE_INVENTORY.md)
- [Source differences and unknown values](docs/DISCREPANCIES.md)
- [Research and UX notes](docs/RESEARCH_NOTES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Verification report](docs/VERIFICATION.md)

The sound on/off feature is listed on the Turkish product page. Turkish manual 09 omits the combination. The app reports the /LI regional combination as unconfirmed for /ND, with no definitive operational sequence.

The guide shows documented defrost ranges. The simulator uses 100 g steps, based on the reported chicken programme increment. Healthy Steam uses the listed discrete quantities. Auto Cook uses the fixed quantity associated with each code. The display uses `AUTO` when a programme duration is unknown.

## Update verified content

1. Check the exact `/ND` support page for a new manual.
2. Download the manual, record its filename, revision, publication date and SHA-256.
3. Extract with `pdftotext -layout`. Render tables, diagrams and warnings with `pdftoppm` and compare all numbers against the images.
4. Edit the canonical records. Keep missing increments and display values null. Preserve stable IDs for local bookmarks.
5. Update provenance and the research files. Increment `knowledge.version` and set the review date.
6. Run tests, regenerate print assets, validate, build and run the browser suite.
7. Inspect PDFs and screenshots before a later deployment.

Original Samsung PDFs are kept in ignored `sources/` for local research. They are not included in the open-source license. If automatic retrieval fails, place the exact manual at `sources/manual-tr.pdf` and record its source and hash in the registry. App source links need an internet connection. Operational data and source metadata work offline.

## Hosting

The production VPS serves `dist/` from the static service in [ops](ops/). The shared Caddy proxy provides HTTPS for `macroparticle.onurbal.com`. The static service handles direct programme, simulator and settings links. Missing static assets return 404.

HTML and the service worker use revalidation. Hashed assets use immutable caching. The service worker stays at the origin root. See [release instructions](ops/README.md).

The app has no backend, accounts, analytics or runtime AI service. It provides reviewed instructions. It does not operate the appliance remotely.

## License

Application code, original illustrations and authored summaries use MIT. Samsung documentation, model names and trademarks retain their respective rights. Noto Sans uses the bundled SIL Open Font License. DM Sans is included through its font package with its license. Dependency licenses apply to their own packages.
