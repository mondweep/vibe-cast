# North East India: Demographics & Open-Data Landscape

> Research report (Phase 0). Produced by the RuFlo `researcher` agent (Sonnet).
> Base census: India Census 2011 (Office of the Registrar General & Census
> Commissioner of India). FIPS ADM1 codes here **independently match** the GDELT
> capability report — resolving the earlier data-quality flag.

## 1. State-by-State Demographic Table

> The next official headcount is **Census 2027** (Phase 1 houselisting
> Apr–Sep 2026; enumeration Mar 2027) — the first since 2011. All "latest"
> figures are model-based projections, not measured counts.

| State | Capital | Population (Census 2011) | Latest est. (~2026) | Area (km²) | Density (/km²) | Literacy (2011) | Major Languages |
|---|---|---|---|---|---|---|---|
| **Arunachal Pradesh** | Itanagar | 1,383,727 | ~1.7M | 83,743 | 17 | 65.38% | Nyishi, Adi, Bengali, Hindi, Nepali, ~26 Tani/Tibeto-Burman |
| **Assam** | Dispur | 31,205,576 | ~37M | 78,438 | 397 | 72.19% | Assamese (official), Bengali, Bodo, Mising, Karbi, Dimasa, Hindi |
| **Manipur** | Imphal | 2,855,794 | ~3.4M | 22,327 | 122 | 79.21% | Meitei (official), English, Tangkul, Thadou-Kuki, Paite, Hmar |
| **Meghalaya** | Shillong | 2,966,889 | ~3.7M | 22,429 | 132 | 74.43% | Khasi, Garo, Pnar/Jaintia, English, Hindi |
| **Mizoram** | Aizawl | 1,097,206 | ~1.3M | 21,081 | 52 | 91.33% | Mizo (de facto official), English |
| **Nagaland** | Kohima | 1,978,502 | ~2.4M | 16,579 | 119 | 79.55% | English (official), Nagamese (lingua franca), 16+ Naga languages |
| **Sikkim** | Gangtok | 610,577 | ~720K | 7,096 | 86 | 81.42% | Nepali (official), Sikkimese/Bhutia, Lepcha, Limbu, English |
| **Tripura** | Agartala | 3,673,917 | ~4.4M | 10,486 | 350 | 87.22% | Bengali (dominant), Kokborok/Tripuri (official), English |

## 2. Regional Aggregates

| Metric | Value | Notes |
|---|---|---|
| **Combined population (2011)** | **45,772,188** | Sum of 8 states (verified) |
| India total (2011) | 1,210,854,977 | ORGI official |
| **NE share of India** | **~3.78%** | by population |
| Combined area | 262,179 km² | ~7.98% of India |
| Est. 2026 combined | ~54.6M | indicative only |

## 3. Data Availability, Quality & Projection Notes

- **Census delay:** the 2021 census was postponed (COVID) — first delay in 150
  years. Now **Census 2027** (₹11,718 cr approved; first digital census).
- **Projection sources:** NCP "Population Projections for India and States
  2011–2036" (MoHFW, 2020 — uses extrapolation for the 7 smaller NE states,
  component method for Assam); UIDAI Aadhaar saturation (>90% in most NE states,
  a cross-check not a count); ORGI SRS annual rates; UN WPP (national only).
- **NE-specific caveats:**
  - **Nagaland** population *fell* 2001→2011 (only such state) — attributed to
    2001 over-enumeration; known accuracy caveat.
  - **Manipur** final 2,855,794 (provisional 2,721,756) — hill-district
    enumeration is hard.
  - **Arunachal Pradesh** is subject to China's territorial claim; some
    international (UN-convention) datasets exclude/flag it.
  - Limited sub-district digital data; >54% of NE population is Scheduled Tribe
    (separate, less-digitised tables); substantial out-migration weakens
    projections.

## 4. Authoritative Open Datasets & APIs

**Census of India** — Census Digital Library / data portal
(https://censusindia.gov.in/census.website/en/data, REST API, free w/ key);
Primary Census Abstract 2011 on data.gov.in
(https://www.data.gov.in/catalog/primary-census-abstract-2011-india-and-states-0).

**MoSPI** — eSankhyiki portal (https://esankhyiki.mospi.gov.in/, API, 1.7M+
records, launched Jun 2024; MCP server at github.com/nso-india/esankhyiki-mcp);
Statistical Year Book; "Women and Men in India 2023".

**Population projections** — NCP 2011–2036 via Dataful
(https://dataful.in/datasets/18521/, CSV/XLSX/Parquet) and ArcGIS; UIDAI Aadhaar
Saturation Report (Mar 2024).

**RBI** — Handbook of Statistics on Indian States 2024–25 (10th ed., Dec 2025)
— state-wise literacy, birth/death rate, TFR, IMR, life expectancy.

**Boundaries** — GADM India v4.1 (shapefile/GeoJSON/GeoPackage, free
non-commercial, persistent GIDs); **Natural Earth** Admin-1 (public domain,
incl. ISO/FIPS/HASC attributes); HDX geoBoundaries (CC-BY); Survey of India.

**World Bank** — Subnational Population Database (ADM1 time series 2000–2016,
CC-BY).

**Programmatic** — `datagovindia` (PyPI) client; NDAP (ndap.niti.gov.in) REST
API aggregating data.gov.in / MoSPI / RBI.

## 5. Geographic Identifiers for Dataset Joins

| State | ISO 3166-2 | FIPS 10-4 (GDELT ADM1) | HASC | GADM GID_1 |
|---|---|---|---|---|
| Arunachal Pradesh | IN-AR | **IN30** | IN.AR | IND.8_1 |
| Assam | IN-AS | **IN03** | IN.AS | IND.12_1 |
| Manipur | IN-MN | **IN17** | IN.MN | IND.16_1 |
| Meghalaya | IN-ML | **IN18** | IN.ML | IND.15_1 |
| Mizoram | IN-MZ | **IN31** | IN.MZ | IND.21_1 |
| Nagaland | IN-NL | **IN20** | IN.NL | IND.13_1 |
| Sikkim | IN-SK | **IN29** | IN.SK | IND.9_1 |
| Tripura | IN-TR | **IN26** | IN.TR | IND.18_1 |

- **ISO 3166-2:IN** — recommended join key for new/international work.
- **FIPS 10-4 / GEC** — officially withdrawn (NIST 2008, NGA 2015) but **this is
  what GDELT stores**; verified empirically against live GDELT GKG data (see
  `03-todays-snapshot.md`).
- **GADM GID_1** = `IND.{n}_1`; embedded in boundary attribute tables.

## Sources
- 2011 Census of India — https://en.wikipedia.org/wiki/2011_census_of_India
- Northeast India (aggregates) — https://en.wikipedia.org/wiki/Northeast_India
- censusindia2011.com state profiles — https://www.censusindia2011.com/
- statoids India subdivisions — https://statoids.com/uin.html
- FIPS region codes (G–I) — https://en.wikipedia.org/wiki/List_of_FIPS_region_codes_(G%E2%80%93I)
- ISO 3166-2:IN — https://handwiki.org/wiki/ISO_3166-2:IN
- GADM India — https://gadm.org/maps/IND_1.html ; https://gadm.org/download_country.html
- Natural Earth Admin-1 — https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
- HDX geoBoundaries India — https://data.humdata.org/dataset/geoboundaries-admin-boundaries-for-india
- ORF internet connectivity NE India (2025) — https://www.orfonline.org/expert-speak/internet-connectivity-in-northeast-india-gaps-gains-and-future-growth
- UIDAI Aadhaar Saturation (Mar 2024) — https://uidai.gov.in/images/Aadhaar_Saturation_Report_31032024.pdf
- NCP Population Projections 2011–2036 — https://ruralindiaonline.org/en/library/resource/population-projections-for-india-and-states-2011-2036/ ; https://dataful.in/datasets/18521/
- MoSPI eSankhyiki — https://esankhyiki.mospi.gov.in/
- RBI Handbook of Statistics on Indian States 2024–25 — https://rbi.org.in/Scripts/AnnualPublications.aspx?head=Handbook+of+Statistics+on+Indian+States
- data.gov.in Census APIs — https://www.data.gov.in/apis/?sector=Census+and+Surveys
- Census India API docs — https://censusindia.gov.in/census.website/data/api/documentation
- World Bank subnational population — https://datacatalog.worldbank.org/dataset/subnational-population-database
- Census 2027 — https://www.pib.gov.in/PressReleasePage.aspx?PRID=2255461
- datagovindia (PyPI) — https://pypi.org/project/datagovindia/
- NDAP — https://ndap.niti.gov.in/
