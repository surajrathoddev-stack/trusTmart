# trusTmart

### Trust the product. Trace its journey.

**A product-authenticity and supply-chain traceability platform.**

Verify what you buy. Understand where it came from. Follow the evidence
behind every product.


[![Repository](https://img.shields.io/badge/GitHub-trusTmart-181717?style=for-the-badge&logo=github)](https://github.com/surajrathoddev-stack/trusTmart)
[![Status](https://img.shields.io/badge/Status-In_Development-orange?style=for-the-badge)](#project-status)
[![Contributions](https://img.shields.io/badge/Contributions-Welcome-2ea44f?style=for-the-badge)](#contributing)

**A product should have a story. Its evidence should be traceable.**
:::

------------------------------------------------------------------------

## The problem we're solving

Counterfeit products, fragmented supply-chain records and unverifiable
seller claims make it difficult to know whether a product is genuine.

A product label can tell you what a brand wants you to know. trusTmart
aims to help you examine the evidence behind the product.

We are building a unified verification workflow that connects product
records, physical product identity, seller evidence and supply-chain
events with blockchain-backed integrity references.

## What trusTmart is building

  -----------------------------------------------------------------------
  Capability                          What it is intended to do
  ----------------------------------- -----------------------------------
  Product identity                    Connect a catalogue product to a
                                      uniquely identified physical unit.

  QR-based verification               Let users scan a QR code or enter a
                                      unit ID to inspect a product's
                                      record.

  Seller assessment                   Evaluate available public business
                                      evidence and explain the result.

  Supply-chain traceability           Record and display relevant custody
                                      and status events.

  Blockchain integrity                Anchor integrity references and
                                      verify relevant on-chain events.

  Explainable results                 Present an outcome with reasons and
                                      supporting evidence, not just a
                                      badge.
  -----------------------------------------------------------------------

## How verification is intended to work

``` mermaid
flowchart TD
    A["Product enters the catalogue"] --> B["Manufacturer registers a physical unit"]
    B --> C["Unique unit ID and QR are generated"]
    C --> D["Supply-chain events are recorded"]
    D --> E["Consumer scans QR or enters unit ID"]
    E --> F["Central verification service"]
    F --> G["Product and unit record"]
    F --> H["Seller evidence assessment"]
    F --> I["Provenance and custody history"]
    F --> J["Blockchain and integrity checks"]
    G --> K["Evidence-based result"]
    H --> K
    I --> K
    J --> K
    K --> L["AUTHENTIC"]
    K --> M["SUSPICIOUS"]
    K --> N["UNVERIFIED"]
```

> **Our principle:** A positive result must be supported by evidence.
> Missing or inconclusive evidence must never be silently treated as
> proof of authenticity.

## The verification result

The planned consumer experience is designed around three clear outcomes:

  -----------------------------------------------------------------------
  Result                              Meaning
  ----------------------------------- -----------------------------------
  `AUTHENTIC`                         Required checks have passed and the
                                      available evidence supports the
                                      result.

  `SUSPICIOUS`                        Conflicting evidence, an integrity
                                      mismatch or another defined risk
                                      signal has been detected.

  `UNVERIFIED`                        Evidence is missing, inconclusive
                                      or unavailable, so authenticity
                                      cannot be established.
  -----------------------------------------------------------------------

The result is intended to include product information, seller-evidence
summary, verification reasons, transaction references and a supply-chain
timeline.

------------------------------------------------------------------------

## System architecture

The platform is being developed as connected modules with clearly
defined responsibilities.

``` mermaid
flowchart TB
    subgraph CLIENT["Application layer"]
        UI["React + TypeScript frontend"]
        QR["QR / Manual Unit Lookup"]
        WALLET["Wallet connection"]
    end

    subgraph CORE["Core application layer"]
        API["Backend API"]
        AUTH["Authentication & Role Access"]
        VERIFY["Verification Orchestrator"]
        UNIT["Product Unit & Supply-chain Services"]
    end

    subgraph DATA["Data and evidence layer"]
        DB[("PostgreSQL")]
        SELLER["Seller Verification Service"]
        CATALOG["Consolidated Product Catalogue"]
    end

    subgraph CHAIN["Blockchain layer"]
        CONTRACT["Smart Contract"]
        EVENTS["Transaction Events"]
        HASH["SHA-256 Integrity References"]
    end

    UI --> API
    QR --> API
    WALLET --> CONTRACT
    API --> AUTH
    API --> VERIFY
    API --> UNIT
    UNIT --> DB
    VERIFY --> DB
    VERIFY --> SELLER
    VERIFY --> CATALOG
    VERIFY --> HASH
    VERIFY --> EVENTS
    CONTRACT --> EVENTS
    CONTRACT --> HASH
```

*Architecture overview of the intended system. Individual interfaces and
deployment details will be finalized during implementation.*

## Technology direction

The following technologies are part of the planned implementation. Their
presence in this list does not imply that every component is already
integrated.

::: {align="center"}
  -----------------------------------------------------------------------------------------------------------------------------------------------------
  Layer                               Technology
  ----------------------------------- -----------------------------------------------------------------------------------------------------------------
  Frontend                            ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
                                      ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
                                      ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

  Backend                             ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
                                      ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)

  Database                            ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)

  Blockchain                          ![Solidity](https://img.shields.io/badge/Solidity-363636?style=flat-square&logo=solidity&logoColor=white)
                                      ![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=flat-square&logo=ethereum&logoColor=white)
                                      ![Hardhat](https://img.shields.io/badge/Hardhat-FFF100?style=flat-square&logo=hardhat&logoColor=black)

  Wallet integration                  ![MetaMask](https://img.shields.io/badge/MetaMask-F6851B?style=flat-square&logo=metamask&logoColor=white)
                                      ![ethers.js](https://img.shields.io/badge/ethers.js-2535A0?style=flat-square)

  Integrity                           ![SHA256](https://img.shields.io/badge/SHA--256-Integrity%20Checks-555555?style=flat-square)
  -----------------------------------------------------------------------------------------------------------------------------------------------------
:::

## Product domains

The consolidated catalogue is planned to cover six product domains:

1.  Electronics
2.  Apparel and Fashion
3.  Cosmetics and Personal Care
4.  Automotive and Industrial Parts
5.  Pharmaceuticals
6.  FMCG and Food/Beverage

Product records are intended to retain source references and verified
identifiers where available. GTIN/UPC/EAN values are not to be invented,
and regulatory identifiers must not be misrepresented as package GTINs.

------------------------------------------------------------------------

## Application roles

The planned application supports five distinct roles:

  -----------------------------------------------------------------------
  Role                                Responsibility
  ----------------------------------- -----------------------------------
  Admin                               Manage stakeholder accounts,
                                      approvals and role assignments.

  Manufacturer                        Register physical product units
                                      against catalogue products.

  Supplier                            Inspect units and record permitted
                                      custody updates.

  Retailer                            Receive units, maintain status and
                                      mark eligible units as sold.

  Consumer                            Verify a product and inspect its
                                      available evidence and history.
  -----------------------------------------------------------------------

Authorization is enforced by the backend; hiding a screen in the
frontend is not sufficient access control.

## Project status

```{=html}
<details>
```
```{=html}
<summary>
```
`<strong>`{=html}Current development scope`</strong>`{=html}
```{=html}
</summary>
```
The project is being developed in parallel modules:

-   **Frontend:** Role-based application, dashboards, QR flows and
    wallet interface.
-   **Database and catalogue:** PostgreSQL schema, migrations, product
    datasets and repeatable import pipeline.
-   **Seller verification:** Evidence collection, explainable assessment
    and trust-service API.
-   **Core integration:** Backend APIs, smart contract, integrity
    verification and the central consumer verification workflow.

This repository's README describes the target product and architecture.
Refer to the source code, branches, issues and pull requests for
verified implementation progress.

```{=html}
</details>
```
## Repository structure

The repository structure will evolve as the modules are integrated. The
intended high-level organization is:

``` text
trusTmart/
├── frontend/          # Web application
├── backend/           # Core APIs and verification services
├── blockchain/        # Smart contracts and deployment scripts
├── database/          # Schema, migrations and seed/import scripts
├── seller-service/    # Seller assessment service
├── datasets/          # Sourced product catalogue data
├── docs/              # API, architecture and setup documentation
└── README.md
```

*Use the actual repository folders as the source of truth; this is the
target organization, not a claim that every directory already exists.*

## Getting involved

We welcome thoughtful contributions, technical feedback and suggestions.

Before contributing:

1.  Check the existing issues and open pull requests.
2.  Discuss significant changes before starting parallel work.
3.  Keep changes focused and use clear commit messages.
4.  Add or update tests and documentation for behaviour you change.
5.  Never commit credentials, private keys or real environment files.

For project-specific collaboration, coordinate with the repository
maintainers before changing shared database schemas, API contracts or
smart-contract interfaces.

## Engineering principles

-   **Evidence over assumptions** --- never fabricate product
    identifiers or seller proof.
-   **Fail safely** --- unavailable evidence is not a successful
    verification.
-   **Privacy by design** --- do not put personal or confidential
    information on-chain.
-   **Clear ownership** --- keep modules and interfaces maintainable.
-   **Reproducibility** --- document setup, migrations, tests and
    deployment.
-   **Explainability** --- every verification outcome should have
    understandable reasons.

---------------------------------------------------------------------

::: {align="center"}
### Built around one simple idea

## Trust should be verifiable.

trusTmart --- Product authenticity. Supply-chain visibility.
Evidence-led trust.

`<br/>`{=html}

[**Explore the
repository**](https://github.com/surajrathoddev-stack/trusTmart)   ·  
[**Report an
issue**](https://github.com/surajrathoddev-stack/trusTmart/issues)

`<sub>`{=html}Developed as an evolving software project. Features and
integrations are subject to implementation and
verification.`</sub>`{=html}
:::
