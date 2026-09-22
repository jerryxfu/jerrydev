# Robotics course on jerryxf.net — plan and status

Last updated 2026-09-14. State verified against `origin/main` (commit `5f65ee9`): `tsc -b --noEmit` clean, `vite build` OK.

A standalone handoff for a fresh Claude Code session (written in French, with the verified gotchas and the
remaining-work split) was delivered to Jerry as `HANDOFF-robotics-course.md`. This doc is the longer-lived plan;
the handoff is the operational briefing.

## What the course is

Two parts plus a shelf of references, all under one blog topic (`robotics`, /blog/topics/robotics):

- **Core — Computer vision (French).** Vision on the robot: cameras, AprilTags, robust localization, pose estimation, tuning the Limelights (+ cheatsheet). Object detection only at surface level.
- **Extras — Artificial intelligence (English).** "For the curious": AI/ML basics, neural networks, object detection, LLMs. Purely informational; in-person formation will still be given in French.
- **Tools (French).** Cheatsheets: Limelight, coordinates/units, math toolkit, vision debugging checklist.

Out of scope, deliberately: Jerry's ground-plane inverse projection project.

## Decisions taken

- **Lesson order (2026-09-02):** Localisation robuste comes BEFORE the SolvePnP lesson. Lesson 3 treats `botpose` as a black box the code consumes (MT1/MT2 described operationally); lesson 4 opens the box (PnP, reprojection error, ambiguity/flip, MegaTag mechanics, transform chain). Rationale: PnP is more complex; students first accept what it gives. Cross-references between the two depend on this order — do not reorder.
- **Tone:** every page follows the published intro's voice — personal, conversational, first person, addresses the team as "vous" (English equivalents on the AI pages). Jerry's authoring loop: he drafts in Word, pastes back into MDX, Claude reformats.
- Languages: vision lessons + cheatsheets French, AI chapter English; technical terms always stay in English (e.g. *axis aligned bounding box*).
- Titles are Jerry's (with 🍋‍🟩 on some): "L'estimation de pose avec SolvePnP", "Localisation robuste: sur le robot", "Calibrer les Limelight 🍋‍🟩". No space before colon in his titles.
- Chapter markers: "Computer vision 🍋‍🟩" does not break (intro chains into lesson 1); "Artificial intelligence" and "Tools" break; unnamed breaks between cheatsheets.
- TODO convention: visible `<Callout kind="important" label="TODO">` blocks. `grep -rn 'label="TODO"'` finds them.
- Prefer delivering **extracts** over whole files: Jerry usually has local edits ahead of the repo. He commits and pushes himself.

## Pages (syllabus order) — verified 2026-09-14

Files now live in subfolders (`posts/robotics/vision/`, `ai/`, `cheatsheet/`), with `vision-intro.mdx` at the root.
Folders are filing only: the slug is the file's basename, since `/blog/:slug` is a single wouter segment.

| Page | Lines | TODOs | State |
| --- | --- | --- | --- |
| `vision-intro` | 75 | 0 | **Published.** Written by Jerry; the tone reference for everything else. |
| `vision-cameras` | 242 | 3 | **Published.** Near-final; missing figures only. |
| `vision-apriltags` | 183 | 4 | Fleshed-out skeleton |
| `vision-localization` | 183 | 8 | Skeleton — the biggest gap (three team mechanisms) |
| `vision-pose-estimation` | 198 | 3 | Fleshed-out skeleton |
| `vision-limelight-tuning` | 139 | 6 | Skeleton; nearly all of it depends on the real hardware |
| `ai-basics` | 160 | 3 | Written; figures missing |
| `ai-neural-networks` | 158 | 4 | Written; figures missing |
| `ai-object-detection` | 140 | 3 | Written; figures missing |
| `ai-llms` | 138 | 1 | Written |
| `cheatsheet-limelight` | 161 | 2 | Written; generic values to replace |
| `cheatsheet-coordinates` | 118 | 1 | Written |
| `cheatsheet-math` | 177 | 1 | Written |
| `cheatsheet-vision-debug` | 88 | 1 | Written |

Everything except the two published pages is `draft: true`.

## Figures

Generator scripts live in `src/pages/BlogPage/scripts/` and output to `src/assets/blog/robotics/`:
`figure_pixels.py` (an image is numbers), `figure_pinhole.py` (pinhole model, image plane, ray),
`figure_frames.py` (the four frames, 2×2, 2D image panel + three 3D triads inside a wireframe cube).

Convention: transparent PNG, no padding (`fig.patch.set_alpha(0)`, `savefig(transparent=True, bbox_inches="tight",
pad_inches=0)`, PIL alpha-bbox crop), rendered in dark themes through `img.diagram` in `src/assets/styles/prose.scss`
(`filter: invert(1) hue-rotate(180deg)` under `[data-theme="night"]` / `[data-theme="burgundy"]`). Never put
`.diagram` on a photo.

## Open items (verified, small)

1. `pinhole-camera.png` is transparent but its `<img>` lacks `className="diagram"` — invisible on dark themes.
2. `figure_pixels.py` still saves with `facecolor="white"` (lines 41, 82); its PNG is opaque and shows as a white slab on dark themes.
3. `<details>` / `<summary>` has no styling in `prose.scss`; `vision-cameras.mdx` uses two and they render with the browser's native triangle.
4. Content gap: the frames figure shows **WPILib** robot space ($Y$ left); the Limelight UI uses $Y$ right. A warning sentence belongs under the figure in `vision-cameras.mdx` — it is currently only in the cheatsheet.

## Remaining TODOs (Jerry-only)

Team cameras/mounts and camera→robot transforms; pipeline values per camera; the three `Localization.java` mechanisms
(SolvePnP flip detection, rolling convergence window, MT1/MT2 trust scaling); std-dev formula and rejection
thresholds; testing procedure; competition-arrival routine and backup/restore; real failures for the debug checklist;
the tags and measured ranges that matter for the season's game.

A session can do without him: the missing figures (distortion, MNIST, neuron, two-layer net, loss curve, convolution,
the three exposure/gain captures), the yearly refresh of AI examples, and language/consistency passes.

## Gotchas already paid for once

TOC reads only `h2`/`h3`, so a `###` inside `<details>` still lists (use `####`); no math in headings (KaTeX puts
several copies in the DOM → "ZZZ"); markdown `![]()` does not work (import + `<img className=... src={...}/>`);
a bare `<style>` breaks the build (needs `<style>{`…`}</style>`); KaTeX has `\cancel`/`\bcancel`/`\xcancel` but not
`\cancelto`/`\enclose`; mplot3d clips text at the axes box regardless of `clip_on`. Word mangles four things on every
paste: the `import` line (→ mailto link), `bmatrix` backslashes, relative links, and quotes.

Limelight AprilTag tuning, for the record: black level 0, sensor gain **maxed**, then raise exposure from zero.
(An earlier "gain around 15" note was wrong and has been corrected in `vision-cameras.mdx`; the cheatsheet still
needs the same fix.)

## Verify before delivering

`pnpm exec tsc -b --noEmit` (not `tsc --noEmit`, a no-op with project references) · `pnpm exec eslint .`
(one pre-existing warning in `Footer.tsx`) · `pnpm exec vite build`. For anything MDX, run `pnpm dev` and open the
page — the build says nothing about a broken KaTeX formula, a badly indented `<details>`, or a heading polluting the
TOC. Dev mode also logs mismatches between `posts.tsx`, `topics.tsx` and the files on disk.

## Open questions

- Session length per day and who is in the room.
- Which Limelight models / coprocessor the team runs.
- Whether the robot code repo is public (would let the `Localization.java` sections be drafted from the actual code).


# Handoff — cours Robotics sur jerryxf.net

État vérifié le 14 septembre 2026 sur `origin/main` (commit `5f65ee9`). Build vert : `tsc` 0 erreur, `vite build` OK.

Ce document est écrit pour une session Claude Code qui reprend le travail. Lis-le au complet avant de toucher
quoi que ce soit — la moitié des pièges listés plus bas ont déjà coûté du temps une fois.

---

## 1. Ce qu'est le projet

Jerry (mentor FRC Team 3990) donne une formation vision/IA à son équipe de programmation. La formation vit sur son
blogue, `jerryxf.net`, dans le topic **Robotics**. Le dépôt est `github.com/jerryxfu/jerrydev` (React + TypeScript +
Vite, MDX pour les articles, déployé sur Cloudflare Pages).

Le cours a trois parties :

| Chapitre | Contenu | Langue |
| --- | --- | --- |
| **Computer vision** | Le cœur. Caméras, AprilTags, localisation, SolvePnP, réglage des Limelight. | Français |
| **Artificial intelligence** | Optionnel, « pour les curieux ». Rien n'y est appliqué sur le robot. | Anglais |
| **Tools** | Quatre aide-mémoire de référence. | Français |

**Règle de langue absolue :** les termes techniques restent en anglais partout, même en prose française
(*fiducial marker*, *reprojection error*, *axis aligned bounding box*). Jerry y tient. La traduction française
n'apparaît qu'en apposition, quand elle aide.

---

## 2. Où c'est rendu

Deux leçons sont **publiées**, les douze autres sont `draft: true` (listées sur la page du topic, mais la route
refuse le slug en production).

| Fichier | Lignes | TODO | État |
| --- | --- | --- | --- |
| `vision-intro.mdx` | 75 | 0 | **Publié.** Écrit par Jerry. C'est la référence de ton pour tout le reste. |
| `vision/vision-cameras.mdx` | 242 | 3 | **Publié.** Quasi fini, il ne manque que des figures. |
| `vision/vision-apriltags.mdx` | 183 | 4 | Squelette étoffé, prose générique écrite |
| `vision/vision-localization.mdx` | 183 | 8 | Squelette. **Le plus gros trou** : trois mécanismes de l'équipe à documenter. |
| `vision/vision-pose-estimation.mdx` | 198 | 3 | Squelette étoffé |
| `vision/vision-limelight-tuning.mdx` | 139 | 6 | Squelette. Presque tout dépend du matériel réel. |
| `ai/ai-basics.mdx` | 160 | 3 | Rédigé, manque des figures |
| `ai/ai-neural-networks.mdx` | 158 | 4 | Rédigé, manque des figures |
| `ai/ai-object-detection.mdx` | 140 | 3 | Rédigé, manque des figures |
| `ai/ai-llms.mdx` | 138 | 1 | Rédigé |
| `cheatsheet/cheatsheet-limelight.mdx` | 161 | 2 | Rédigé, valeurs génériques à remplacer |
| `cheatsheet/cheatsheet-coordinates.mdx` | 118 | 1 | Rédigé |
| `cheatsheet/cheatsheet-math.mdx` | 177 | 1 | Rédigé |
| `cheatsheet/cheatsheet-vision-debug.mdx` | 88 | 1 | Rédigé |

Les `TODO` sont des `<Callout kind="important" label="TODO">` visibles dans la page. `grep -rn 'label="TODO"'`
pour les trouver tous.

---

## 3. Les fichiers qui comptent

```
src/pages/BlogPage/
  posts.tsx                       manifeste : slug, titre, description, date, tags, lang, draft
  topics.tsx                      le syllabus du topic « robotics » : ordre, chapitres, prev/next
  posts/robotics/
    vision-intro.mdx
    vision/                       5 leçons
    ai/                           4 leçons
    cheatsheet/                   4 aide-mémoire
  scripts/
    figure_pixels.py              « une image, c'est des nombres »
    figure_pinhole.py             le modèle sténopé, plan image et rayon
    figure_frames.py              les quatre repères, 2×2, plots 3D
src/assets/blog/robotics/         les PNG générés par ces scripts
src/assets/styles/prose.scss      le style de la sortie MDX (images, .diagram, etc.)
```

**Les dossiers sous `posts/` sont du classement, pas du routage.** Le slug est le *basename* du fichier, parce que
`/blog/:slug` est un seul segment wouter. Deux fichiers de même nom dans deux dossiers s'écrasent silencieusement —
une vérification en mode dev le crie dans la console.

---

## 4. Conventions à respecter

**Ordre des leçons.** Dans `topics.tsx`, `vision-localization` vient **avant** `vision-pose-estimation`, et c'est
volontaire : la leçon 3 traite `botpose` comme une boîte noire que le code consomme, la leçon 4 ouvre la boîte
(PnP, ambiguïté, MegaTag). Jerry a choisi cet ordre parce que PnP est plus complexe et qu'on peut d'abord accepter
le résultat. **Ne pas réordonner.** Les renvois croisés entre les deux leçons dépendent de cet ordre.

**Marqueurs de chapitre.** Un marqueur `{chapter: "..."}` avec `break: true` coupe la chaîne prev/next. Le marqueur
« Computer vision » ne coupe **pas**, pour que « suivant » depuis l'intro mène à la première leçon. Les marqueurs
« Artificial intelligence » et « Tools » coupent, et un `{break: true}` anonyme sépare chaque aide-mémoire.

**Ton.** Personnel, première personne, s'adresse à l'équipe au « vous ». Jerry raconte ses propres galères
(« on l'a appris à la dure »). Lis `vision-intro.mdx` avant d'écrire une ligne : c'est le mètre étalon.

---

## 5. Pièges vérifiés

Tous testés en compilant ou en rendant la page, pas devinés.

**La table des matières ne liste que `h2` et `h3`.** `PostToc` fait `querySelectorAll("h2[id], h3[id]")`. Donc :

- Un `###` à l'intérieur d'un `<details>` **apparaît quand même** dans la TOC et pointe vers du contenu replié.
  Utiliser `####` pour les sous-titres à l'intérieur d'un dropdown — il est stylé mais invisible pour la TOC.
- **Jamais de maths dans un titre.** `### Pourquoi diviser par $Z$?` s'affiche « Pourquoi diviser par ZZZ? » dans
  le rail, parce que KaTeX met plusieurs copies du symbole dans le DOM. Utiliser `*Z*`.

**`<details>` / `<summary>`.** Pas de composant, c'est du HTML natif et ça marche en MDX.

- L'indentation à 4 espaces du contenu **est correcte** — MDX la retire par rapport à la balise JSX. Vérifié en
  compilant : listes, `$$` et titres ressortent bien.
- Les lignes vides avant et après le contenu sont **obligatoires**, sinon markdown avale le bloc.
- Dans `<summary>`, utiliser `<em>Z</em>` plutôt que `*Z*` : l'emphase markdown est capricieuse sur la même ligne
  qu'une balise JSX.
- **`<details>` n'a encore aucun style** dans `prose.scss`. C'est un chantier ouvert (voir section 6).

**Images.** `![](...)` en markdown **ne marche pas** — aucun plugin remark n'y transforme le `src` en import, donc
le chemin sort tel quel et casse en production. La forme qui marche :

```jsx
import _fig from "@/assets/blog/robotics/figure_pinhole.png";

<img className="diagram" src={_fig} alt="..." />
```

`className`, pas `class` (MDX compile en JSX). La classe `.diagram` applique
`filter: invert(1) hue-rotate(180deg)` sur les thèmes `night` et `burgundy` — **à mettre sur tout PNG à fond
transparent, et surtout pas sur une photo.**

**KaTeX.** `\cancel{}`, `\bcancel{}`, `\xcancel{}` fonctionnent. `\cancelto{}` et `\enclose{}` **n'existent pas**
dans KaTeX. `\sout` marche mais déclenche un avertissement de mode strict. Le trait de `\cancel` hérite de la
couleur du texte, donc il suit le thème tout seul.

**Un `<style>` dans un MDX** exige le template literal `<style>{`...`}</style>`, sinon les accolades du CSS sont
lues comme une expression JSX et le build casse sur `Could not parse expression with acorn`.

**matplotlib.** Les trois scripts produisent des PNG transparents sans marge : `fig.patch.set_alpha(0)`,
`savefig(transparent=True, bbox_inches="tight", pad_inches=0)`, puis un rognage final sur les pixels opaques via
PIL. Pour `figure_frames.py` en particulier : **mplot3d coupe le texte au bord de sa boîte** et `clip_on=False`
n'y change rien — c'est pourquoi les positions d'étiquettes sont explicites dans le tableau `FRAMES` et pourquoi
l'étiquette longue de « Field space » est placée *sous* sa flèche plutôt qu'au bout.

---

## 6. Trois choses ouvertes, vérifiées

1. **`pinhole-camera.png` est transparent mais son `<img>` n'a pas `className="diagram"`.** Il deviendra invisible
   sur les thèmes sombres. À corriger, ou à remplacer par une image à fond opaque si c'est une photo.
2. **`tag36_11_00000-pixel_values.png` est opaque** (fond blanc) — correct tel quel, mais il fera un gros rectangle
   blanc en thème sombre. `figure_pixels.py` a encore `facecolor="white"` aux lignes 41 et 82; le passer en
   transparent comme les deux autres scripts, puis ajouter la classe.
3. **Aucun style pour `<details>`.** `vision-cameras.mdx` en utilise deux et ils s'affichent avec le triangle natif
   du navigateur. Le style irait dans `src/assets/styles/prose.scss`, à côté de la règle `img`.

---

## 7. Ce qui reste à écrire

Les TODO se divisent en deux familles très différentes.

**Ce que seul Jerry peut écrire** (ne pas inventer, ne pas combler avec du générique) :

- `vision-localization` — les trois mécanismes de `Localization.java` : détection du *flip*, fenêtre de convergence
  glissante pour le rejet des aberrations, pondération MT1/MT2. Plus la formule d'écarts-types et les seuils réels.
- `vision-limelight-tuning` — modèles de caméras, noms d'hôte, valeurs de pipeline par caméra, routine d'arrivée en
  compétition, procédure de sauvegarde/restauration.
- `cheatsheet-vision-debug` — les pannes réellement vécues et ce qui les a réglées.
- `cheatsheet-limelight` — les valeurs de l'équipe et la version de `LimelightHelpers` utilisée.
- `vision-apriltags` — les tags qui comptent pour le jeu de la saison, les portées mesurées.

**Ce qu'une session peut faire** :

- Les figures manquantes, via de nouveaux scripts dans `posts/BlogPage/scripts/` sur le modèle des trois existants
  (distorsion, MNIST, neurone, réseau à deux couches, courbe de perte, convolution, les trois captures
  exposition/gain).
- Les exemples IA à rafraîchir : `ai-basics` et `ai-llms` contiennent des TODO explicites disant que les exemples
  de modèles vieillissent vite.
- Les relectures de langue et de cohérence.

**Un manque de contenu à signaler :** le schéma des quatre repères montre les conventions **WPILib** (Robot space
avec $Y$ vers la **gauche**). Dans l'interface Limelight, le robot space a son $Y$ vers la **droite**. C'est le
piège le plus coûteux du cours et il n'est mentionné que dans l'aide-mémoire. Une phrase d'avertissement sous le
schéma dans `vision-cameras.mdx` serait justifiée.

---

## 8. Comment Jerry travaille

- Il rédige ses leçons **dans Word**, puis colle le texte et demande de le reformater en MDX propre. Word casse
  systématiquement : la ligne d'`import` (transformée en lien `mailto:`), les `\\` des environnements `bmatrix`,
  les liens relatifs (réécrits en `word-edit.officeapps.live.com/...`), les guillemets. Vérifier ces quatre points
  à chaque collage.
- **Discuter avant d'écrire un fichier.** Il n'aime pas qu'on produise un document avant que la discussion soit
  réglée. Proposer un extrait plutôt qu'un fichier complet quand c'est possible — il a souvent déjà modifié sa
  copie locale.
- Ses explications préférées sont **longues et déroulées**, en phrases simples. Le style dense et compressé lui
  passe à côté.
- **C'est lui qui commit et qui pousse.** Livrer des extraits ou des fichiers, pas des commits.

---

## 9. Vérifier avant de livrer

```bash
pnpm exec tsc -b --noEmit    # PAS `tsc --noEmit`, no-op avec les project references
pnpm exec eslint .           # un avertissement pré-existant dans Footer.tsx
pnpm exec vite build
```

Et pour tout ce qui touche au MDX, faire tourner `pnpm dev` et **ouvrir la page**. Le build ne dit rien sur une
formule KaTeX cassée, un `<details>` mal indenté ou un titre qui pollue la table des matières. Chercher
`.katex-error` dans le DOM rendu.

La console en mode dev signale aussi les incohérences entre `posts.tsx`, `topics.tsx` et les fichiers présents —
un slug listé sans fichier, un fichier sans entrée, deux fichiers au même basename.

---

## 10. Contexte plus large

Le plan complet du cours, avec l'historique des décisions, vit dans le projet claude.ai « Artificial Intelligence »,
document `claude/robotics-course-plan.md`.