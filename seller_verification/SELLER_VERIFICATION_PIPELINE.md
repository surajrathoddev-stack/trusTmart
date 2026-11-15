# Seller Verification Pipeline

Status: prototype. Scope: seller checks only. A seller result never proves that a product is genuine.

## 1. Inputs

POST /api/sellers/assess accepts a JSON body. Any field not listed here is rejected with error 422.

- legalName (required): the seller's legal or business name. Blank values are rejected.
- website (optional): must be a valid URL. Used by the website check.
- registrationNumber (optional): company or licence registration number. Blank values are rejected. Used by the registry check.
- address (optional): the address the seller gave. Used by the address check.
- productCheck (optional, PROPOSAL): one of passed, failed, could not be verified.
- provenanceCompleteness (optional, PROPOSAL): same allowed values as productCheck.

A missing optional input is treated as "could not be verified", never as a pass.

## 2. Checks

Registry match. Needs registrationNumber. Looks up the number in the registry source. The only source today is reviewer-entered records, so without a loaded record the result is "could not be verified". If the record status is not ACTIVE, the result is failed. If the names are different, the result is failed. If the names are similar but not identical (for example "Sri Sharma Medical" against "Sharma Medical"), the result is "could not be verified" and a reviewer must confirm. If the source fails unexpectedly, the result is "could not be verified".

Name rule. Names are compared in lowercase, without punctuation. "Pvt" and "Private", and "Ltd" and "Limited", are treated as the same. Equal names are a match. One name that contains every word of the other, plus extra words, is "near". Anything else is "different".

Website domain. Compares the words of the business name with the website domain, ignoring legal suffixes, "www" and the scheme. All words present: passed. Some words present: "could not be verified". No words present: failed. No website: "could not be verified".

Address consistency. Normalises case, punctuation and common abbreviations (Rd to Road, St to Street). Equal addresses pass. A different address is "could not be verified", never failed, because one company can have several premises. A missing address is "could not be verified". No registry address is available yet, so this check cannot pass today.

Product check and provenance completeness are taken from the optional inputs. Missing means "could not be verified".

## 3. Scoring

Three parts, with starting weights: seller evidence 40%, product check 40%, provenance completeness 20%.

- Seller evidence: failed if any seller check failed. Passed only if every seller check passed. Otherwise "could not be verified".
- Overall status:
  - Any part failed: HIGH_RISK, no score.
  - Any part missing: UNKNOWN, no score.
  - All parts passed: VERIFIED, with score 100.

The score appears only for VERIFIED. The explanation always states that the result is a seller evidence score, not proof that a product is genuine.

## 4. Routes

- GET /health: returns {"status": "ok"}.
- POST /api/sellers/assess: runs the checks and scoring, and returns the result.
- GET /api/sellers/:sellerId/trust: NOT BUILT. Waiting for the storage decision.

## 5. Response

Fields: sellerId (null until storage is approved), evidenceStatus, score, factors (one per seller check), scoringBreakdown (one per part), explanation, sourceUrls (empty until a live source is approved), and checkedAt (UTC timestamp, different on every request).

Real request and response examples are in API_EXAMPLES.md.

## 6. Datasets

- data/fmcg_food: 51 food and drink records from the Open Food Facts India site. Built by build_json.py from products.csv.
- data/pharma: 60 over-the-counter medicine records from the FDA National Drug Code Directory. Built by make_pharma_csv.py from the downloaded file, then build_json.py. The downloaded file itself is not in the repository.

Rules followed in both datasets: no invented barcodes, NDC codes stay in the NDC column and never in gtin, and every row has a source URL.

Catalogue import file for the central database: PENDING. Depends on the database team's answers about the NDC format and the failed-barcode rule.

## 7. Tests

Run from the seller_verification folder:

python -m pytest -v

All tests should pass. The suite covers the data model, request validation, scoring, the registry, name matching, the website check, the address check, the assessment endpoint, safe-failure rules, the two signal inputs, the environment example, and both datasets.

## 8. Pending decisions (not agreed)

- How the main system calls this service: PENDING. Depends on the backend decision.
- Where results are stored, and which seller table design is final: PENDING. Depends on the backend and database decision.
- Registry source for live lookups (MCA, FSSAI or both): PENDING. Lead decision. Current approach is reviewer entry.
- Product check and provenance completeness input formats: PROPOSAL. Not yet agreed with the backend team.