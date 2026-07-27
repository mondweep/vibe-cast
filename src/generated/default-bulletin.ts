/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Produced by `scripts/generate-default-bulletin.ts` from
 * `fixtures/Daily_Flood_Report_20260727.pdf`. Regenerate with:
 *
 *     npm run generate:default-bulletin
 *
 * This is the real 2026-07-27 ASDMA Daily Flood Report, already parsed, so the
 * console can open on a working example without loading pdf.js and without
 * touching the network (NFR-3, NFR-5, NFR-6). It is a **worked example**, not
 * today's situation: `src/domain/timeline/staleness.ts` and the staleness
 * banner exist to make sure no officer can mistake it for one.
 *
 * Any edit made here will be reported as a failure by
 * `src/adapters/pdf/default-bulletin.test.ts`, which reparses the fixture PDF
 * and compares.
 */

import type {
  BulletinId,
  FloodSituationReport,
  ReportDate,
} from '../domain/shared/flood-situation-report';
import type {
  DistrictName,
  RevenueCircleName,
} from '../domain/shared/administrative-unit';

export const DEFAULT_BULLETIN: FloodSituationReport = {
  "bulletinId": "4ecdaf4b086d499713163847e6fd91bec383b0ebdb6f88a5b2df38b9d8145fe7" as BulletinId,
  "reportDate": "2026-07-27" as ReportDate,
  "generatedAt": "27-07-2026 09:49 PM",
  "rivers": {
    "aboveDangerLevel": [
      "Dhansiri (S) (Numaligarh)",
    ],
    "aboveHighestFloodLevel": [],
  },
  "districts": [
    {
      "district": "Sivasagar" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Nazira" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 41,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 17885,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 8551,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 18,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 4050,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 1340,
          },
        },
        {
          "circle": "Demow" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 24,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 9465,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 463,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 6,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 16,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 567,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 10615,
          },
        },
        {
          "circle": "Sivsagar" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 114,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 71452,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 4321,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 11,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 19,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 6098,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 20187,
          },
        },
        {
          "circle": "Amguri" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 46,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 39152,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 78.5,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 23,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 12,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 13980,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 6813,
          },
        },
        {
          "circle": "Sonari RC part" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 7,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 6507,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 7,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 6507,
          },
        },
      ],
      "villagesAffected": {
        "kind": "known",
        "unit": "count",
        "value": 232,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 67831,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 61163,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 15467,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 144461,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 13413.5,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 58,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 59,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 24695,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 11892,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 10497,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 2281,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 15,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 10,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 45462,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 19797,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 18603,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 7062,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 125,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 45,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 326,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 39278,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 27198,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 139251,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 200,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 600,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 22000,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 82,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 5,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 250,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 98,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 21,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 281,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 1079.624,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 188.96,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 43.76,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 2918,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 5.2,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [
          "NDRF",
          "Local People",
          "Army/Paramilitary force",
          "DDRF",
          "Civil Defence/Trained Volunteers",
          "SDRF",
          "Circle Office/Local Administration",
        ],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 114,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 61,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 59,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Nazira - under assesment), (Demow - Under Assestment), (Amguri - Under Assestment) Report Generated On: 27-07-2026 09:49 PM",
    },
    {
      "district": "Golaghat" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Golaghat" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 28,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 13386,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 923,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 532,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 115,
          },
        },
        {
          "circle": "Khumtai" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 16,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 5004,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 880.55,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 2,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 3,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 86,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 2086,
          },
        },
        {
          "circle": "Bokakhat" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 22,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 2717,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 180.6,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 2,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 315,
          },
        },
        {
          "circle": "Dergaon" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 45,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 17065,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 427.35,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 12,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 3372,
          },
        },
      ],
      "villagesAffected": {
        "kind": "known",
        "unit": "count",
        "value": 111,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 17657,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 14920,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 5595,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 38172,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 2411.5,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 7,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 22,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 618,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 211,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 264,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 120,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 21,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 2,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 5888,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 2744,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 2113,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 1031,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 1143,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 1038,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 4727,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 4018,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 4417,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 102.936,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 18.237,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 5.4726,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 547.11,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 31,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 53.03,
        },
      },
      "rescue": {
        "agencies": [
          "DDRF",
          "SDRF",
        ],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 19,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 2,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Golaghat - 03 nos. of amrit sarovar affected namely 1.Amrit Sarovar at Dui Noi Mukh Sabalombi Gut 2. Amrit Sarovar at Bosa Bhorolua 3 Amrit sarovar at Khumtai Krisok SHG Uttar Komarbondha), (Bokakhat - 1 Poresh Doley son of Binanda Doley Borpak 2 Pratap Das son of Lt Nomal Das Bortika 3 Dilip Das son of Late Bhunu Das vill Borpak 4 Jitu Das son of Biren Das vill Borpak All the above-mentioned beneficiaries' boats have been partially damaged due to flood on 21.07.2026 under Bokakhat Revenue Circle ), (Dergaon - Distributed Suji, Sagoo)",
    },
    {
      "district": "Charaideo" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Mahmora" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 67,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 67128,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 7340,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 9,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 6,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 1251,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Sonari" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 80,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 121276,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 8512,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 2,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 358,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Sapekhati" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 2,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 1797,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      ],
      "villagesAffected": {
        "kind": "known",
        "unit": "count",
        "value": 149,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 71578,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 77014,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 39812,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 188404,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 17649,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 11,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 6,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 1609,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 576,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 663,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 300,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 44,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 26,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 648,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 1262,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 1341,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 1490,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 5661,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 10,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 3500,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 0,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 7350,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [
          "SDRF",
          "Health",
        ],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 44,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 2,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 36,
        },
      },
      "remarks": "(Mahmora - House Damages and the type of damages (partially/severe/fully) is yet to be ascertained and will be determined after detailed field assessments.), (Sonari - \"Fair Price Shops Damaged (Silakuti GPSS- 2, Pub Abhoipur GPSS- 10, Pachim Abhoipur GPSS- 4\"), Fish Net Damaged- 8 Nos, CM relief packets distribution ongoing.)",
    },
    {
      "district": "Jorhat" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Teok" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 25,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 27366,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 716.5,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 9,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 521,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Mariani" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 6,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Jorhat West" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 57,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 41931,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 2025.9200000000003,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 1,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 1252,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 427,
          },
        },
        {
          "circle": "Titabor" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 16,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 5161,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 580.2,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 2,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Jorhat East" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 23,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      ],
      "villagesAffected": {
        "kind": "known",
        "unit": "count",
        "value": 108,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 30824,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 30364,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 13270,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 74458,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 3345.62,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 14,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 3,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 1773,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 723,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 726,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 303,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 17,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 4,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 427,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 131,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 133,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 163,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 269,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 538,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 16237,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 5172,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 60,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 62,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 247,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 89,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 4,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 8.532,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 1.614,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0.4842,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 48.42,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 186.82,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 2,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 2,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Teok - Chainlink fenching damage 35m Slope erosion in two parts 40m At Changmaigarh Amrit Sarovar PH1,Chainlink fenching damage 30m Slope erosion in two parts 35m At Changmai garh Amrit Sarovar phase 2 ,Chainlink fenching damage 35m Slope erosion in two parts 40m At Phukanbari Amrit Sarovar ), (Mariani - The grazing land of the affected areas is partially inundated with flood water. There is acute shortage of fodder for the flood affected livestock as reported by Veterinary dept.), (Jorhat West - No. of spot sources affected 72 nos, No of IHHL 80 nos, spot source disinfected 12 nos.), (Jorhat East - 9 nos. of spot source disinfected and 110 leaflets distributed under Jorhat East Revenue Circle by PHE, Jorhat.)",
    },
    {
      "district": "Nagaon" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Nagaon" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 14,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Samaguri" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 8,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 123,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Kampur" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 8,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 196,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      ],
      "villagesAffected": {
        "kind": "known",
        "unit": "count",
        "value": 30,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 319,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 0,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 4,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 920,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 663,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 7642,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 4319,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 0,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 47.37,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "",
    },
    {
      "district": "Kamrup (M)" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Dispur" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 1,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0.9,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      ],
      "villagesAffected": {
        "kind": "known",
        "unit": "count",
        "value": 1,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 0.9,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 0,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 0,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 0,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "",
    },
    {
      "district": "Dhemaji" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Sissiborgaon" as RevenueCircleName,
          "villagesAffected": {
            "kind": "unknown",
            "unit": "count",
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      ],
      "villagesAffected": {
        "kind": "unknown",
        "unit": "count",
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 0,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 0,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 0,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 0,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "",
    },
    {
      "district": "Dibrugarh" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Dibrugarh East" as RevenueCircleName,
          "villagesAffected": {
            "kind": "unknown",
            "unit": "count",
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Naharkatia" as RevenueCircleName,
          "villagesAffected": {
            "kind": "unknown",
            "unit": "count",
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Tengakhat" as RevenueCircleName,
          "villagesAffected": {
            "kind": "unknown",
            "unit": "count",
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Moran" as RevenueCircleName,
          "villagesAffected": {
            "kind": "unknown",
            "unit": "count",
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Dibrugarh West" as RevenueCircleName,
          "villagesAffected": {
            "kind": "unknown",
            "unit": "count",
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      ],
      "villagesAffected": {
        "kind": "unknown",
        "unit": "count",
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 0,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 0,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 0,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "casualties": {
        "floodDeaths": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "generalDrownings": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "missing": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "animals": {
        "affected": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        "washedAway": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
      },
      "houses": {
        "fullySeverelyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "relief": {
        "rice": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 0,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Naharkatia - As per report received from Joint Director of Health Services under Naharkatia Revenue Circle today Medical Team Deployed -3Nos, on 27.07.2026), (Tengakhat - As per report received from Joint Director of Health Services under Tengakhat Revenue Circle today Medical Team Deployed -2 Nos, on 27.07.2026), (Moran - As per report received from Joint Director of Health Services under Moran Revenue Circle today Medical Team Deployed -1no, on 27.07.2026), (Dibrugarh West - As per report received from the Veterinary Officer, State Veterinary Dispensary, Dibrugarh 4 (four) Nos Veterinary camp have been organized under Dibrugarh West Revenue Circle on 27.07.2026 As per report received from Joint Director of Health Services under Dibrugarh West Revenue Circle today Medical Team Deployed -2nos, on 27.07.2026)",
    },
  ],
  "infrastructureDamage": [
    {
      "damageClass": "road",
      "district": "Charaideo" as DistrictName,
      "circle": "Sonari" as RevenueCircleName,
      "name": "Thukubill Satra Road",
      "department": "PWD (Roads)",
      "village": "Dakhin Saonari Habi Gaon",
      "location": "dakhin sonari habi gaon",
      "coordinate": {
        "kind": "precise",
        "longitude": 95.032543,
        "latitude": 27.015787,
      },
      "remarks": "flood water overtop 3.50 KM",
    },
    {
      "damageClass": "road",
      "district": "Dhemaji" as DistrictName,
      "circle": "Sissiborgaon" as RevenueCircleName,
      "name": "Road from Silasuti GP office to Silabrahmapur",
      "department": "PWD (Roads)",
      "village": "Brohmapurkac hari",
      "location": "At 2nd KM",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.756054,
        "latitude": 27.659483,
      },
      "remarks": "The extent of damaged occurred on dated 6-07- 2026. approximately 80.00 meters.",
    },
    {
      "damageClass": "road",
      "district": "Dhemaji" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Road on Sengajan Kachari - Napam Kuli to Bambazar Road",
      "department": "PWD (Roads)",
      "village": "No. 1 Chengajankach ari",
      "location": "At 1st KM",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.8591,
        "latitude": 27.63067,
      },
      "remarks": "The extent of damaged occurred on dated 6-07- 2026. approximately 10.00 meters.",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "Titabor" as RevenueCircleName,
      "name": "1/1 Doijan Bridge approach road",
      "department": "PWD (Roads)",
      "village": "Doijan Grant",
      "location": "Ch.3.6 KM to Ch. 3.7 KM",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.1074,
        "latitude": 26.65291,
      },
      "remarks": "Due to excess flood water, a section of approach road of 1/1 doijan bridge has been affected and vehicular movement has been restricted",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Kopahtoli Road (Kopahoni Road)",
      "department": "PWD (Roads)",
      "village": "Mejenga no 1 Grant",
      "location": "Majenga Kopahoni (Ch. 0.550 KM to Ch.0.560 KM)",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.156269,
        "latitude": 26.600589,
      },
      "remarks": "Due to excess flood water, a section of Kopatoli road has been eroded and vehicular movement has been restricted.",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Gar-ali Road at 40th KM",
      "department": "PWD (Roads)",
      "village": "Block No 4",
      "location": "Senijan, Bekajan and Panikhaiti",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.164942,
        "latitude": 26.369761,
      },
      "remarks": "GAR-ALI ROAD AT 40TH KM (FROM CH.39560.00 M TO CH.39960.00 M) HAVE BEEN DAMAGED AND ERODED BY THE FLOOD WATER OF RIVER SENIJAN ON 06TH JULY/2026 IN THE AFTERNOON DUE TO FLASH FLOOD",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Gohain Gaon Ali",
      "department": "PWD (Roads)",
      "village": "Block No 3",
      "location": "Gohain Gaon",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.157433,
        "latitude": 26.398562,
      },
      "remarks": "GOHAIN ALI ROAD AT 2ND KM HAVE BEEN OVERTOPPED AND ERODED and A 1200MM DIA HUME PIPE CULVERT HAS BEEN DAMAGED BY FLASH FLOOD WATER OF RIVER BEKAJAN IN THE AFTERNOON OF 6TH JULY2026",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Kakodunga Block-2 to Gar Ali Road",
      "department": "PWD (Roads)",
      "village": "Block No 2",
      "location": "Doklongia Gaon and No.2 Sereli Missing Gaon",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.15407,
        "latitude": 26.399711,
      },
      "remarks": "KAKODUNGA BLOCK-2 TO GAR ALI ROAD AT 2ND KM HAVE BEEN OVERTOPPED AND ERODED BY FLASH FLOOD WATER OF RIVER BEKAJAN IN THE AFTERNOON OF 06TH JULY/2026",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "RCC BR. NO.36/2 ON GAR ALI ROAD AT BALIJAN MISSING GAON, BEKAJAN",
      "department": "PWD (Roads)",
      "village": "Kakodonga Habi Gaon -2",
      "location": "Balijan and Gorajan",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.165465,
        "latitude": 26.418992,
      },
      "remarks": "BRIDGE APPROACH ROAD OF RCC BR. NO.36/2 ON GAR ALI ROAD AT BALIJAN MISSING GAON, BEKAJAN HAVE BEEN ERODED AND DAMAGED BY THE FLASH FLOOD WATER OF RIVER BALIJAN IN THE MORNING OF 20TH JULY2026",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "GAR-ALI ROAD 40th KM",
      "department": "PWD (Roads)",
      "village": "Half Mile Belt",
      "location": "Senijan, Bekajan and Panikhaiti",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.165002,
        "latitude": 26.369765,
      },
      "remarks": "GAR-ALI ROAD AT 40TH KM HAVE BEEN DAMAGED AND ERODED BY THE FLASH FLOOD WATER OF RIVER SENIJAN ON 20TH JULY/2026 IN THE MORNING.",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "GAR-ALI ROAD 33rd KM",
      "department": "PWD (Roads)",
      "village": "Gorajan Gaon",
      "location": "Balijan, Gorajan, Kulapani",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.167214,
        "latitude": 26.461906,
      },
      "remarks": "GAR-ALI ROAD AT 33RD KM HAVE BEEN SUBMERGED AND ERODED BY THE FLASH FLOOD WATER OF SHILDUBI RIVER ON 22ND JULY/2026 IN THE MORNING.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "Demow" as RevenueCircleName,
      "name": "Habi Gaon Road",
      "department": "PWD (Roads)",
      "village": "Rajabari NC",
      "location": "Habi Gaon",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.724511,
        "latitude": 27.059774,
      },
      "remarks": "Over Topping due to Flood.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "Amguri" as RevenueCircleName,
      "name": "Dupdaria Ali",
      "department": "PWD (Roads)",
      "village": "Lunpuria( Dupdor)",
      "location": "Dupdaria Ali",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.4672,
        "latitude": 26.9499,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damu Ali",
      "department": "PWD (Roads)",
      "village": "Ganak",
      "location": "Damu Ali",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6589,
        "latitude": 26.8907,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Thiya Ali",
      "department": "PWD (Roads)",
      "village": "Namti Pathar",
      "location": "Thiya Ali",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5708,
        "latitude": 26.8905,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Namdongia Koiri Gaon Road",
      "department": "PWD (Roads)",
      "village": "Sensua Namdongia",
      "location": "Namdongia Koiri Gaon Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6578,
        "latitude": 26.8371,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Deopani Satra Road",
      "department": "PWD (Roads)",
      "village": "Sensua Namdongia",
      "location": "Deopani Satra Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6552,
        "latitude": 26.831,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Rangagara Road",
      "department": "PWD (Roads)",
      "village": "Aila Habi",
      "location": "Rangagara Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.7003,
        "latitude": 26.8119,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Gohain Bari Road",
      "department": "PWD (Roads)",
      "village": "Gohain Gaon",
      "location": "Gohain Bari Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.7072,
        "latitude": 26.8267,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Dulakakhoriya to Dhonekhana Road",
      "department": "PWD (Roads)",
      "village": "Dulia",
      "location": "Dulakakhoriya to Dhonekhana Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6821,
        "latitude": 26.8318,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Bamgaon Road",
      "department": "PWD (Roads)",
      "village": "Borbam grant",
      "location": "Bamgaon Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6849,
        "latitude": 26.8297,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Seuni Ali to Roadghaiting",
      "department": "PWD (Roads)",
      "village": "Morapukhuri",
      "location": "Seuni Ali to Roadghaiting",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5551,
        "latitude": 26.857,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Chintamonigarh to Mukalani Road",
      "department": "PWD (Roads)",
      "village": "Chirakhunda",
      "location": "Chintamonigarh to Mukalani Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.4381,
        "latitude": 26.9377,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Hatighuli Road",
      "department": "PWD (Roads)",
      "village": "Phukonfodia",
      "location": "Hatighuli Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.4902,
        "latitude": 26.9369,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Tingiripam Abhaypuria",
      "department": "PWD (Roads)",
      "village": "Ganak",
      "location": "Tingiripam Abhaypuria",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6714,
        "latitude": 26.8875,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Dimaruguri Road",
      "department": "PWD (Roads)",
      "village": "Mout Gaon (Dikshu)",
      "location": "Dimaruguri Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.4627,
        "latitude": 26.9518,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Khanamukh Road",
      "department": "PWD (Roads)",
      "village": "Mout Gaon(Dupdor)",
      "location": "Khanamukh Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.4751,
        "latitude": 26.9447,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Benudhar Sharma Road",
      "department": "PWD (Roads)",
      "village": "Boga Gohain",
      "location": "Benudhar Sharma Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5565,
        "latitude": 26.9085,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Charing Baruati",
      "department": "PWD (Roads)",
      "village": "Kakati",
      "location": "Charing Baruati",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5382,
        "latitude": 26.9152,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1 no Baruati",
      "department": "PWD (Roads)",
      "village": "Jehenia Gharfalia",
      "location": "1 no Baruati",
      "coordinate": {
        "kind": "approximate",
        "longitude": 94.52,
        "latitude": 26.9062,
        "reason": "insufficient-precision",
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Boga Gohain Ali",
      "department": "PWD (Roads)",
      "village": "Gajpuria Kakati",
      "location": "Boga Gohain Ali",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5294,
        "latitude": 26.9033,
      },
      "remarks": "Road Overtoped by flood water in multiple stretches.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Charing Dulia Gaon",
      "department": "PWD (Roads)",
      "village": "Chaliha KaKoti",
      "location": "Charing Dulia Gaon",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5294,
        "latitude": 26.9033,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Naga Ali Charing",
      "department": "PWD (Roads)",
      "village": "Kakati",
      "location": "Naga Ali Charing",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5373,
        "latitude": 26.9158,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Naga Ali",
      "department": "PWD (Roads)",
      "village": "Gohain Gaon",
      "location": "Naga Ali",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5401,
        "latitude": 26.9228,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Namdang Ali Dulakakhoriya",
      "department": "PWD (Roads)",
      "village": "Namdang Kumar",
      "location": "Namdang Ali Dulakakhoriya",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6539,
        "latitude": 26.8355,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Sunari Bari",
      "department": "PWD (Roads)",
      "village": "Boga Gohain",
      "location": "Sunari Bari",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5384,
        "latitude": 26.9208,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Takoria Ali",
      "department": "PWD (Roads)",
      "village": "Kakati",
      "location": "Takoria Ali",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5254,
        "latitude": 26.9104,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Phukan Phadiya Road",
      "department": "PWD (Roads)",
      "village": "Phukonfodia",
      "location": "Phukan Phadiya Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5316,
        "latitude": 26.9412,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Moglow Ali Kawaimari Panchayat to Khanamukh Panchayat",
      "department": "PWD (Roads)",
      "village": "Burha Gaon",
      "location": "Moglow Ali Kawaimari Panchayat to Khanamukh Panchayat",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.4732,
        "latitude": 26.9612,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Tikha Belimukhia to Chetia Changmai Road",
      "department": "PWD (Roads)",
      "village": "Mout Gaon (Dikshu)",
      "location": "Tikha Belimukhia to Chetia Changmai Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6068,
        "latitude": 26.8839,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Tikha Belimukhia to Khemdoi connecting Road",
      "department": "PWD (Roads)",
      "village": "Jula Gaon",
      "location": "Tikha Belimukhia to Khemdoi connecting Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6255,
        "latitude": 26.8746,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Tikha Belimukhia to Bharaluwa Road",
      "department": "PWD (Roads)",
      "village": "Belimukhia",
      "location": "Tikha Belimukhia to Bharaluwa Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5885,
        "latitude": 26.8862,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Mahmora Pathar Tamulibari Gaon Road",
      "department": "PWD (Roads)",
      "village": "Namti Pathar",
      "location": "Mahmora Pathar Tamulibari Gaon Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5911,
        "latitude": 26.8937,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Kirai Ali to Namti Pothar",
      "department": "PWD (Roads)",
      "village": "Ghurachuwa Kamar",
      "location": "Kirai Ali to Namti Pothar",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5949,
        "latitude": 26.9033,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Moutgaon Road",
      "department": "PWD (Roads)",
      "village": "Mout Gaon(Dupdor)",
      "location": "Moutgaon Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6017,
        "latitude": 26.8711,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Waksung Road",
      "department": "PWD (Roads)",
      "village": "Belimukhia",
      "location": "Waksung Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.587,
        "latitude": 26.8688,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Adarsha Gaon Road",
      "department": "PWD (Roads)",
      "village": "Ganak",
      "location": "Adarsha Gaon Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.6472,
        "latitude": 26.8855,
      },
      "remarks": "Road Overtoped by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "Sonari RC part" as RevenueCircleName,
      "name": "Gumutha Dhudar Ali",
      "department": "PWD (Roads)",
      "village": "Deodhai Gaon",
      "location": "Gumutha Dhudar Ali",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.769251,
        "latitude": 26.955166,
      },
      "remarks": "Sonari RC (sivasagar Dist Part)",
    },
    {
      "damageClass": "other",
      "district": "Charaideo" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "3.37",
      "department": "PRAMUD",
      "village": "Fishery",
      "location": "Borbil No.1",
      "coordinate": undefined,
      "remarks": "27",
    },
    {
      "damageClass": "other",
      "district": "Charaideo" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "7",
      "department": "944 No Ligiribari",
      "village": "Education",
      "location": "Dhamdhuli",
      "coordinate": undefined,
      "remarks": "26.96966",
    },
    {
      "damageClass": "other",
      "district": "Charaideo" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "6",
      "department": "BORAHI",
      "village": "Women &",
      "location": "Na- Gaon",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "0.8",
      "department": "fishery",
      "village": "Fishery",
      "location": "Barichuwa",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "0.35",
      "department": "Fishery/Pond",
      "village": "Fishery",
      "location": "Kaiborta Gaon (Rangamati T.E.)",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "6",
      "department": "GELABIL",
      "village": "Education",
      "location": "dergaon town",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1",
      "department": "KARAYANI HIGH",
      "village": "Education",
      "location": "Koraianibhakat",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "4",
      "department": "25 No. Uppar",
      "village": "Women &",
      "location": "Uppar",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1",
      "department": "Laughoga bosti line road",
      "village": "PWD (Roads)",
      "location": "Chabukdhara",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1",
      "department": "Gormora chapori to ckahala ghat",
      "village": "PWD (Roads)",
      "location": "No. 2 Gormora",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1",
      "department": "Bhola Hazarika path",
      "village": "PWD (Roads)",
      "location": "Jelehuwa gaon",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "16.41",
      "department": "Fishery/pond",
      "village": "Fishery",
      "location": "Bogariani",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "23",
      "department": "TEOK BAGAN LP",
      "village": "Education Deptt.",
      "location": "Jogduarhabi",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "3",
      "department": "ANUSUCHIT",
      "village": "Education",
      "location": "Gelekoni",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "32",
      "department": "Teok Bagan-II",
      "village": "Women & Child Developme nt",
      "location": "Teok Grant",
      "coordinate": undefined,
      "remarks": "26.83542 5",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "24",
      "department": "Puthinodi Ring",
      "village": "P&RD",
      "location": "Boloma Pathar",
      "coordinate": undefined,
      "remarks": "26.75134",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "0.15",
      "department": "Fish Pond affected",
      "village": "Fishery",
      "location": "Gharpholia- Maibelia Gaon",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1",
      "department": "577 NO TIRUAL",
      "village": "Education",
      "location": "Deberapar",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "10",
      "department": "248 No.",
      "village": "Education",
      "location": "Khongia",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "9",
      "department": "2 No. Niz",
      "village": "Women &",
      "location": "Na Hatia",
      "coordinate": undefined,
      "remarks": "26.81198",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "8",
      "department": "DAKHINPAT LP",
      "village": "Education Deptt.",
      "location": "Dakhinpat Gaon",
      "coordinate": undefined,
      "remarks": "26.60786 1",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1",
      "department": "Bengenakhua",
      "village": "Women &",
      "location": "Thengal Gaon",
      "coordinate": undefined,
      "remarks": "26.57853",
    },
    {
      "damageClass": "other",
      "district": "Kamrup (M)" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "2",
      "department": "Fisheries/Pond",
      "village": "Fishery",
      "location": "Tintukura Nonke",
      "coordinate": undefined,
      "remarks": "26.1234",
    },
    {
      "damageClass": "other",
      "district": "Nagaon" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1",
      "department": "Barhampur",
      "village": "PWD",
      "location": "Niz-Chapanala",
      "coordinate": undefined,
      "remarks": "26.33614",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "12",
      "department": "Dulakakharia",
      "village": "PHE",
      "location": "Dulakakhoria",
      "coordinate": undefined,
      "remarks": "26.82977",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "94",
      "department": "625 No.",
      "village": "Education",
      "location": "No.3 Khula",
      "coordinate": undefined,
      "remarks": "0",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "5",
      "department": "Borsayak",
      "village": "Women & Child Developme nt",
      "location": "Borsayak Dibrual",
      "coordinate": undefined,
      "remarks": "26.85699 2",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "3",
      "department": "Dhitaipukhuri",
      "village": "Education",
      "location": "Bhajoni Gaon",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "18",
      "department": "538 No. Nahar",
      "village": "Education",
      "location": "Khanikor Gaon",
      "coordinate": undefined,
      "remarks": "",
    },
  ],
  "statewideTotals": {
    "districtsAffected": {
      "kind": "known",
      "unit": "count",
      "value": 6,
    },
    "revenueCirclesAffected": {
      "kind": "known",
      "unit": "count",
      "value": 21,
    },
    "villagesAffected": {
      "kind": "known",
      "unit": "count",
      "value": 631,
    },
    "populationAffected": {
      "kind": "known",
      "unit": "count",
      "value": 445495,
    },
    "cropAreaSubmerged": {
      "kind": "known",
      "unit": "Hect",
      "value": 37139.52,
    },
    "reliefCamps": {
      "kind": "known",
      "unit": "count",
      "value": 90,
    },
    "reliefDistributionCentres": {
      "kind": "known",
      "unit": "count",
      "value": 94,
    },
    "campInmates": {
      "kind": "known",
      "unit": "count",
      "value": 28695,
    },
    "nonCampInmates": {
      "kind": "known",
      "unit": "count",
      "value": 51777,
    },
  },
  "provenance": [
    {
      "kind": "rivers-above-danger-level",
      "sourcePages": [
        1,
      ],
      "confidence": "high",
    },
    {
      "kind": "districts-affected",
      "sourcePages": [
        1,
      ],
      "confidence": "high",
    },
    {
      "kind": "revenue-circles-affected",
      "sourcePages": [
        1,
      ],
      "confidence": "high",
    },
    {
      "kind": "villages-affected",
      "sourcePages": [
        1,
      ],
      "confidence": "high",
    },
    {
      "kind": "population-and-crop-area-submerged",
      "sourcePages": [
        1,
        2,
      ],
      "confidence": "high",
    },
    {
      "kind": "relief-camps-opened",
      "sourcePages": [
        2,
      ],
      "confidence": "high",
    },
    {
      "kind": "inmates-in-relief-camps",
      "sourcePages": [
        2,
      ],
      "confidence": "high",
    },
    {
      "kind": "non-camp-inmates",
      "sourcePages": [
        2,
      ],
      "confidence": "high",
    },
    {
      "kind": "lives-lost-confirmed",
      "sourcePages": [
        3,
      ],
      "confidence": "high",
    },
    {
      "kind": "lives-lost-missing",
      "sourcePages": [
        3,
      ],
      "confidence": "high",
    },
    {
      "kind": "animals-affected",
      "sourcePages": [
        3,
      ],
      "confidence": "high",
    },
    {
      "kind": "animals-washed-away",
      "sourcePages": [
        3,
      ],
      "confidence": "high",
    },
    {
      "kind": "houses-damaged",
      "sourcePages": [
        3,
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "houses-damaged-others",
      "sourcePages": [
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "rescue-operation",
      "sourcePages": [
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "relief-distributed",
      "sourcePages": [
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "relief-distributed-others",
      "sourcePages": [
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-road",
      "sourcePages": [
        5,
        6,
        7,
        8,
        9,
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-bridge",
      "sourcePages": [
        9,
        10,
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-embankment-breached",
      "sourcePages": [
        10,
        11,
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-embankment-affected",
      "sourcePages": [
        11,
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-others",
      "sourcePages": [
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
      ],
      "confidence": "high",
    },
    {
      "kind": "remarks",
      "sourcePages": [
        30,
        31,
      ],
      "confidence": "high",
    },
  ],
  "reconciliationFailures": [],
};
