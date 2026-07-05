# Architecture diagrams — Bindlace

This page complements [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) with **visual maps** of the system: context, packages, internal components, CLI flows, runtime sequences, and **where languages (Node, Java, …) sit**. Diagrams use [Mermaid](https://mermaid.js.org/) and render on GitHub, GitLab, and many Markdown viewers.

**Last updated:** 2026-04-19

---

## 1. System context (C4-style)

Who interacts with what at the highest level: portable specs, the Node runner, and the environment under test.

```mermaid
flowchart LR
  subgraph authors["Authors & automation"]
    DEV["Developers / CI"]
  end

  subgraph portable["Portable artifacts (version control)"]
    WF["*.wflow — steps"]
    WL["*.wloc — locators"]
    WD["*.wdata — data"]
  end

  subgraph bindlace["Bindlace — Node runner"]
    CLI["wflow CLI"]
  end

  subgraph runtime["Runtime environment"]
    BR["Browser\n(Chromium / Chrome)"]
    APP["Application under test"]
  end

  DEV -->|"create / edit"| portable
  DEV -->|"validate | print-ir | run"| CLI
  CLI -->|"read"| portable
  CLI -->|"drive"| BR
  BR -->|"HTTP(S)"| APP
```

---

## 2. Repository and packages

What lives in the repo and how the main **npm** packages relate. The `autonomous-dev/` folder is an experiment and is **not** part of the Bindlace contract (see root [README.md](../README.md)).

```mermaid
flowchart TB
  subgraph repo["jsonautomation / Bindlace repo"]
    subgraph spec["packages/wflow-spec — @bindlace/wflow-spec"]
      SCHEMA["schema/*.json — JSON Schema"]
      EXAMPLES["examples/ — sample wflow / wloc / wdata"]
      IRFIX["examples/resolved-ir/ — golden IR JSON"]
    end

    subgraph nodepkg["packages/wflow-runner-node — @bindlace/wflow-runner-node"]
      CLI2["cli.ts → wflow binary"]
      CORE["merge, resolve, drivers"]
    end

    subgraph java["packages/wflow-runner-java"]
      JVM["planned — same schemas / IR"]
    end

    ROOTEX["examples/ — end-to-end demos"]
  end

  SCHEMA -->|"AJV validate at runtime"| nodepkg
  EXAMPLES -->|"copy in build"| nodepkg
  IRFIX -.->|"contract parity"| java
  nodepkg -.->|"future"| java
```

---

## 3. Logical architecture (artifacts → IR → drivers)

The pipeline described in [SYSTEM_DESIGN.md §2–4](SYSTEM_DESIGN.md): one **resolved IR** feeds either driver without changing user files.

```mermaid
flowchart TB
  subgraph artifacts["Portable artifacts"]
    WF["*.wflow"]
    WL["*.wloc"]
    WD["*.wdata"]
  end

  subgraph pipeline["packages/wflow-runner-node — processing"]
    V["validate + load"]
    F["flatten prerequisites"]
    S["substitute ${data...}"]
    R["resolve locators → IR"]
  end

  subgraph drivers["Driver adapters — same ResolvedIr"]
    PW["Playwright"]
    SE["Selenium WebDriver"]
  end

  WF --> V
  WL --> V
  WD --> V
  V --> F --> S --> R
  R --> IR["ResolvedIr JSON"]
  IR --> PW
  IR --> SE
```

---

## 4. Component diagram — `wflow-runner-node` modules

Internal TypeScript modules and their main relationships. **Driver code** stays at the bottom so shared logic never imports Playwright or Selenium types (see `.cursor/rules/runner-node.mdc`).

```mermaid
flowchart TB
  subgraph entry["Entry"]
    CLI["cli.ts"]
  end

  subgraph loadval["Load & validation"]
    LOAD["load.ts"]
    ART["artifacts.ts"]
    VAL["validate.ts"]
    SCH["schemas.ts — read JSON Schema from disk"]
  end

  subgraph merge["Merge & IR"]
    FF["flowFlatten.ts"]
    RES["resolve.ts"]
    SUB["substitute.ts"]
    TYP["types.ts"]
  end

  subgraph exec["Execution"]
    RF["runFlow.ts"]
    SRF["seleniumRunFlow.ts"]
    PWD["playwrightDriver.ts"]
    SED["seleniumDriver.ts"]
  end

  subgraph cross["Shared utilities"]
    LOG["logger.ts"]
    RE["runErrors.ts"]
  end

  CLI --> ART
  CLI --> FF
  CLI --> RF
  CLI --> SRF
  CLI --> VAL
  CLI --> LOAD
  CLI --> SUB
  CLI --> LOG

  ART --> LOAD
  ART --> VAL
  VAL --> SCH

  FF --> LOAD
  FF --> VAL
  FF --> RES

  RES --> SUB
  RES --> TYP

  RF --> PWD
  RF --> LOG
  SRF --> SED
  SRF --> LOG
  PWD --> TYP
  SED --> TYP
  PWD --> RE
  SED --> RE
```

---

## 5. Pipeline stages (detailed)

Step-by-step mapping to source files (see [SYSTEM_DESIGN.md §4](SYSTEM_DESIGN.md)).

```mermaid
flowchart LR
  A["1. Parse YAML/JSON"] --> B["2. Validate vs schema"]
  B --> C["3. Flatten prerequisites"]
  C --> D["4. Merge wdata + substitute"]
  D --> E["5. Resolve logical keys → LocatorDef"]
  E --> F["6. Emit ResolvedIr"]
  F --> G["7. Driver executes ops"]

  A -.->|"load.ts, artifacts.ts"| A
  B -.->|"validate.ts, schemas.ts"| B
  C -.->|"flowFlatten.ts"| C
  D -.->|"substitute.ts"| D
  E -.->|"resolve.ts"| E
  G -.->|"runFlow / seleniumRunFlow + drivers"| G
```

---

## 6. CLI command flows

What each subcommand does: **validate** can check schema only; **print-ir** and **run** both build the IR; only **run** opens a browser.

```mermaid
flowchart TB
  START(["wflow subcommand"])

  START --> VCMD{validate}
  START --> PIR{print-ir}
  START --> RUN{run}

  VCMD --> V1["Load --flow and optional --locators, --data"]
  V1 --> V2["validateArtifact per kind"]
  V2 --> V3["Entry wflow: collectReachableWflowPaths + validate each prereq"]
  V3 --> VOK["OK lines to stdout"]

  PIR --> P1["loadWflow, loadWloc, optional loadWdata"]
  P1 --> P2["buildResolvedIrFromEntry"]
  P2 --> POUT["JSON ResolvedIr to stdout"]

  RUN --> R1["Same load + buildResolvedIrFromEntry"]
  R1 --> R2["createLogger optional --log-file"]
  R2 --> R3{"--driver"}
  R3 -->|"playwright"| RW["executeResolvedIr → runFlow → playwrightDriver"]
  R3 -->|"selenium"| RS["executeResolvedIrSelenium → seleniumRunFlow → seleniumDriver"]
  RW --> ROK["OK or RunError"]
  RS --> ROK
```

---

## 7. Sequence — `wflow run` (Playwright path)

Typical message flow from CLI to browser. Selenium follows the same **IR** boundary; only the execution block differs.

```mermaid
sequenceDiagram
  participant User
  participant CLI as cli.ts
  participant Art as artifacts.ts
  participant FF as flowFlatten.ts
  participant Res as resolve.ts
  participant RF as runFlow.ts
  participant Drv as playwrightDriver.ts
  participant PW as Playwright Chromium

  User->>CLI: wflow run --flow --locators [--data]
  CLI->>Art: loadWflow / loadWloc / loadWdata
  Art-->>CLI: FlowDoc, LocBundle, DataDoc
  CLI->>FF: buildResolvedIrFromEntry
  FF->>FF: flattenFlowSteps (prerequisites)
  FF->>Res: buildResolvedIr
  Res->>Res: substitute + resolve locators
  Res-->>CLI: ResolvedIr
  CLI->>RF: executeResolvedIr(ir, options)
  RF->>PW: chromium.launch / newPage
  RF->>Drv: runResolvedOnPage(ir, page)
  loop Each resolved step
    Drv->>PW: navigate / click / fill / ...
    PW-->>Drv: result or timeout
  end
  Drv-->>RF: done or RunError
  RF->>PW: browser.close
  RF-->>CLI: OK
  CLI-->>User: logs + exit code
```

---

## 8. Prerequisite flattening

How nested `prerequisites` become a single linear `steps` array before resolution (cycles are rejected).

```mermaid
flowchart TB
  E["Entry wflow file"] --> P{"prerequisites[]?"}
  P -->|"for each path"| C["Load child wflow validate"]
  C --> R["Recurse flattenFlowSteps"]
  R --> M["Concatenate: ...child steps, then own steps"]
  P -->|"none"| M
  M --> OUT["mergedFlow.steps → buildResolvedIr"]
```

---

## 9. Where programming languages fit (authoring vs runtime)

**Authoring** is **not** tied to Java, Python, Node, or .NET: flows are **JSON/YAML** only. **Runtimes** are separate: today the full **validate → merge → resolve → drive browser** path is implemented in **Node/TypeScript**; a **JVM** runner is **planned**; other languages are **not** in this repo but could execute the same **ResolvedIr JSON** if someone implements a runner (see [SYSTEM_DESIGN.md §4–5](SYSTEM_DESIGN.md), [FEATURES.md](FEATURES.md) F7/F12).

### 9a. Three layers: specs → contract → browser drivers

```mermaid
flowchart TB
  subgraph L1["Layer 1 — no programming language"]
    SPEC["*.wflow / *.wloc / *.wdata\n(editors, Git, CI — language-agnostic)"]
  end

  subgraph L2["Layer 2 — merge pipeline → IR"]
    IR["ResolvedIr JSON\n(kind: resolved, resolvedSteps[])"]
    NOTE1["Today: implemented in TypeScript\n(@bindlace/wflow-runner-node)"]
    NOTE2["Planned: same logic in Java\n(F7 / F12 — packages/wflow-runner-java)"]
  end

  subgraph L3["Layer 3 — drive the browser"]
    BROWSER["Chromium / Chrome / …"]
    PW["Playwright APIs\n(language-specific libraries)"]
    SE["WebDriver protocol\n(language-specific bindings)"]
  end

  SPEC --> IR
  IR --> PW
  IR --> SE
  PW --> BROWSER
  SE --> BROWSER
```

Layer 2 is **where “which language” matters for the shipped tooling**: only **Node** implements the full pipeline today. Layer 3 shows that **Playwright** and **Selenium** each have **bindings** in several languages (Node, Java, Python, .NET, …); Bindlace picks one binding **per runner** (e.g. Node uses `playwright` and `selenium-webdriver` npm packages).

### 9b. Who produces IR vs who executes IR (Node, Java, Python, .NET, …)

Solid arrows = **implemented** in this repo. Dashed = **planned** (Java) or **hypothetical** (you would supply a runner).

```mermaid
flowchart TB
  SPEC["Portable specs\n*.wflow / *.wloc / *.wdata"]

  subgraph produce["Produce ResolvedIr — merge + validate + resolve"]
    N["Node + TypeScript\nwflow-runner-node — shipped"]
    J["Java / JVM\nwflow-runner-java — planned F7/F12"]
  end

  IR["ResolvedIr JSON\n(single contract)"]

  subgraph execShipped["Execute IR — shipped (Node runner)"]
    PW_N["Playwright\nnpm package"]
    SE_N["Selenium\nselenium-webdriver npm"]
  end

  subgraph execJava["Execute IR — planned (same IR)"]
    PW_J["Playwright Java"]
    SE_J["Selenium Java"]
  end

  subgraph execHypo["Execute IR — not in repo"]
    PY["Python\n+ playwright / selenium"]
    DOTNET[".NET\n+ Playwright / WebDriver"]
  end

  SPEC --> N
  N --> IR
  SPEC -.-> J
  J -.-> IR
  IR --> PW_N
  IR --> SE_N
  IR -.-> PW_J
  IR -.-> SE_J
  IR -.-> PY
  IR -.-> DOTNET
```

**Important:** `--driver selenium` today means **Selenium’s Node.js binding** talks to ChromeDriver, **not** “Node launches a Java Selenium server.” **Python / .NET / Go** are not part of Bindlace yet; they only appear here as **places you could implement an IR executor** using each ecosystem’s Playwright or WebDriver libraries.

### 9c. Bridge pattern: any language can execute **pre-built IR**

If merge/resolve stays on Node, another stack only needs to **execute** JSON (useful until a full JVM/Python runner exists):

```mermaid
sequenceDiagram
  participant Dev as Developer / CI
  participant Node as Node: wflow print-ir
  participant File as resolved.json
  participant Other as Python / Java / .NET\n(custom thin runner)

  Dev->>Node: print-ir --flow --locators [--data]
  Node->>File: write ResolvedIr JSON
  File->>Other: read JSON, map ops to local Playwright/Selenium API
  Other->>Other: drive browser
```

---

## 10. Resolved IR and extension points

Mental model for contributors: new **author steps** map to **IR ops**; new **drivers** consume the same `ResolvedIr`.

```mermaid
classDiagram
  class ResolvedIr {
    +wflowSpecVersion: 1
    +kind: resolved
    +meta?: flow metadata
    +resolvedSteps: ResolvedStep[]
  }

  class ResolvedStep {
    <<union>>
    op: navigate | click | fill | assertVisible | expectText | expectInputValue | waitFor
    +step?, id?, log?
  }

  class LocatorDef {
    +css?, xpath?, role?, name?, text?
  }

  ResolvedIr "1" *-- "many" ResolvedStep : resolvedSteps
  ResolvedStep ..> LocatorDef : uses for click, fill, ...
```

---

## 11. Document maintenance

When you change the pipeline, CLI, module boundaries, or IR shape:

- Update [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) and this file.
- Follow [docs-sync](../.cursor/rules/docs-sync.mdc): keep [FEATURES.md](FEATURES.md) and [IMPLEMENTATION.md](IMPLEMENTATION.md) in sync when behavior changes.

To **export diagrams** as PNG/SVG for slides or docs, use [Mermaid Live Editor](https://mermaid.live/), the Mermaid CLI, or your IDE’s Mermaid preview.
