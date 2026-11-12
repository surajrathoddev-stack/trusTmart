# Registry Research

**Purpose:** Record which public registries we can use, and what each one really shows.

**Rule:** Only write what we have seen with our own eyes, and record the date.

---

## 1. MCA Portal (company records)

**Page used:** View-Companies-Directors-under-prosecution-V3.html (directors listing, not the general company search)

- **Date and time:** 9/11/26 8.30 PM
- **Search term:** Reliance
- **CAPTCHA appeared:** Yes
- **Login required:** No
- **Search worked:** No
- **Result:** After entering the CAPTCHA code, the page showed "Technical Error Occurred."
- **Note:** Need to confirm the correct company master-data search page before drawing conclusions.

---

## 2. FSSAI (food licence records)

**Page used:** https://foscos.fssai.gov.in/

- **Date and time:** 10 November 2026, 9:00 AM
- **Search term:** Britannia (confirmed)
- **CAPTCHA appeared:** yes 
- **Login required:** No (login link visible, not used)
- **Search worked:** Yes
- **Rows on page 1:** 10, with more pages available (Next button shown)
- **Fields shown:** Company name, premises address, licence/registration number, licence type, validity status, list of products

**Observations:**

- Several premises per company. Each row is a separate factory with its own licence number.
- Two different legal names appear: "Britannia Industries Limited" and "Britannia Dairy Private Limited."
- One licence type is State. The rest are Central.
- Four rows show expired licences (Inactive).
- The same company name appears in different capitalisation (for example, "BRITANNIA INDUSTRIES LIMITED" and "Britannia Industries Limited").

## MCA master data (research, by hand)
Lead decision: both MCA and FSSAI are required. Manual reviewer verification is acceptable for the prototype. Find the MCA master data source; do not use the directors-under-prosecution page.

## Page: MCA services > Master Data section
Login or registration required: yes
Registration: not done (requires business or personal details)
Public search without login: not found yet

Header search for "Britannia Industries": No matching results found (0 in all categories, including Data & Reports)
Interpretation: header search covers site pages and documents only; company records require login

## MCA master data: access check

- **Page reached:** MCA Services > Master Data
- **Result every time:** redirected to the login page (User ID: CIN for companies, email for other users)
- **Public company search:** not found. The header search for "Britannia Industries" returned "No matching results found."
- **Registration:** not done. It needs business or personal details, so it is not done without authorisation.
- **Conclusion:** MCA company master data is only available after login. Access depends on a named person in the team or college holding an authorised login.
- **Status:** waiting for the lead's decision.
- **Date checked:** (fill in)