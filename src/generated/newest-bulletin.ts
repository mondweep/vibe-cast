/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * The newest bulletin the console ships with, already parsed.
 *
 * This one is **eager**: it is in the entry chunk, so the console renders with
 * real figures on first paint without loading pdf.js and without touching the
 * network (NFR-3, NFR-5, NFR-6). Its seven predecessors are not — see
 * `bulletin-archive.ts`.
 *
 * Produced by `scripts/generate-bundled-bulletins.ts` from
 * `fixtures/Daily_Flood_Report_20260727.pdf`. Regenerate with:
 *
 *     npm run generate:bundled-bulletins
 *
 * Any edit made here will be reported as a failure by
 * `src/adapters/pdf/bundled-bulletins.test.ts`, which reparses the fixture
 * PDFs and compares.
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

export const NEWEST_BUNDLED_BULLETIN: FloodSituationReport = {
  "bulletinId": "2e365e62d61998d2e9d35cf0c4990e645822bbb02b1b98c24ed961ccdce2c857" as BulletinId,
  "reportDate": "2026-08-10" as ReportDate,
  "generatedAt": "10-08-2026 08:58 PM",
  "rivers": {
    "aboveDangerLevel": [
      "Dhansiri (S) (Golaghat)",
      "Dhansiri (S) (Numaligarh)",
      "Kushiyara (SRIBHUMI (FFS))",
    ],
    "aboveHighestFloodLevel": [],
  },
  "districts": [
    {
      "district": "Nagaon" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Samaguri" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 57,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 15086,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 2310.1,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 1,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 11,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 297,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 7166,
          },
        },
        {
          "circle": "Kampur" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 23,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 1051,
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
          "circle": "Kaliabor" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 36,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 1276,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 816,
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
          "circle": "Nagaon" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 6,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 546,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 17,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 3,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 407,
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
        "value": 122,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 7035,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 6059,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 3814,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 16908,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 4194.1,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 4,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 11,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 704,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 263,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 289,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 145,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 5,
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
          "value": 7166,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 2916,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 2599,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 1651,
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
            "value": 3285,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 2384,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 4310,
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
          "value": 128.682,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 23.211,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 6.9633,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 24.66,
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
        "agencies": [
          "3",
        ],
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
          "kind": "unknown",
          "unit": "count",
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
      "district": "Golaghat" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Golaghat" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 26,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 2281,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 465,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 1,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 355,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 280,
          },
        },
        {
          "circle": "Khumtai" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 34,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 15277,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 580,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 548,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 1259,
          },
        },
        {
          "circle": "Morongi" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 16,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 6266,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 546.16,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 8,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 3,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 1386,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 1170,
          },
        },
        {
          "circle": "Dergaon" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 32,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 10179,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 402.85,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 7,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 306,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 2176,
          },
        },
        {
          "circle": "Bokakhat" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 36,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 37058,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 30,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 1,
          },
          "reliefDistributionCentres": {
            "kind": "unknown",
            "unit": "count",
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 174,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 980,
          },
        },
        {
          "circle": "Sarupathar" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 3,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 16.93,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "unknown",
            "unit": "count",
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
        "value": 147,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 33899,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 30909,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 6253,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 71061,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 2040.94,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 22,
      },
      "reliefDistributionCentres": {
        "kind": "known",
        "unit": "count",
        "value": 18,
      },
      "campInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 2769,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 965,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 1196,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 561,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 35,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 12,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 5865,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 2727,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 2116,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 1022,
        },
        "animals": {
          "big": {
            "kind": "known",
            "unit": "count",
            "value": 1681,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 1383,
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
            "value": 4445,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 6001,
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
          "value": 116.652,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 20.637,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 6.1895,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 619.11,
        },
        "greenFodder": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
        "wheatBran": {
          "kind": "known",
          "unit": "Q",
          "value": 196.07,
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
          "19",
        ],
        "medicalTeams": {
          "kind": "known",
          "unit": "count",
          "value": 4,
        },
        "boats": {
          "kind": "known",
          "unit": "count",
          "value": 40,
        },
        "helicopters": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
        "personsEvacuatedByBoat": {
          "kind": "known",
          "unit": "count",
          "value": 8,
        },
        "personsEvacuatedByHelicopter": {
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Dergaon - Vety. Camp opened at 2 No Khakandaguri village. Spot source disinfected and leaflets distributed by PHE Dept.)",
    },
    {
      "district": "Sivasagar" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Amguri" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 1880,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 81,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 450,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Nazira" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 15,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 4197,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 1879,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 7,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 470,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Sivsagar" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 48,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 15523,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 250,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 3432,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Sonari RC part" as RevenueCircleName,
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
        "kind": "known",
        "unit": "count",
        "value": 67,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 11058,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 8692,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 1850,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 21600,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 2210,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 17,
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
          "value": 4352,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 2161,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 1842,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 349,
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
          "value": 1,
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
          "value": 135,
        },
        "fullySeverelyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 33,
        },
        "partiallyKuccha": {
          "kind": "known",
          "unit": "count",
          "value": 248,
        },
        "partiallyPukka": {
          "kind": "known",
          "unit": "count",
          "value": 116,
        },
        "otherHuts": {
          "kind": "known",
          "unit": "count",
          "value": 16,
        },
        "otherCattleSheds": {
          "kind": "known",
          "unit": "count",
          "value": 12,
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
          "value": 1200,
        },
        "riceBran": {
          "kind": "known",
          "unit": "Q",
          "value": 0,
        },
      },
      "rescue": {
        "agencies": [
          "36",
        ],
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
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Amguri - PHED Amguri Sub-division water supply through tanker capacity 3000 Ltr. 53 unit tips, water supply through tanker capacity 9000 Ltr. 9 unit tips, Disinfection of spot source total 666 nos., UGR cleaning 20 units.), (Sivsagar - 178 Nos of CM Kit Distributed)",
    },
    {
      "district": "Hojai" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Doboka" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 30,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 984,
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
        "value": 984,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Doboka - 1. Crop Submergence report as submitted by ADO Choudhury Bazar dated 10.08.2026- Sali Paddy- 213ha 2. Crop Submergence report as submitted by ADO Nilbagan dated 10.08.2026- Sali Paddy- 245ha 3. Crop Submergence report as submitted by ADO Rengbeng dated 10.08.2026- Sali Paddy- 364ha, Bao Paddy- 162)",
    },
    {
      "district": "Darrang" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Dalgaon" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 10,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 71,
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
          "circle": "Mangaldoi" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 6,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 305,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 350,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 3,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 1657,
          },
        },
      ],
      "villagesAffected": {
        "kind": "known",
        "unit": "count",
        "value": 16,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 139,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 113,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 53,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 305,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 421,
      },
      "reliefCamps": {
        "kind": "known",
        "unit": "count",
        "value": 0,
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
          "value": 1657,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 639,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 602,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 416,
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
            "value": 900,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 1300,
          },
          "poultry": {
            "kind": "known",
            "unit": "count",
            "value": 2000,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Dalgaon - Report prepared as per report received from Concerned department), (Mangaldoi - Report prepared as per report received from LM and Concerned department)",
    },
    {
      "district": "Cachar" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Lakhipur" as RevenueCircleName,
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
            "value": 13,
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
          "circle": "Sonai" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 10,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 210,
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
        "value": 11,
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
        "value": 223,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Lakhipur - Due to continuous rainfall and flash flood 13 Ha. Crop area affected and 29 Farm Family affected as per report received from Agriculture Deptt.(ADO) Lakhipur Revenue Circle as on dated 10.08.2026), (Sonai - Due to continuous rainfall and flash flood 210 Ha. Crop area affected and 344 Farm Family affected as per report received from Agriculture Deptt.(ADO) Sonai Revenue Circle as on dated 10.08.2026)",
    },
    {
      "district": "Charaideo" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Sonari" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 2,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 2539,
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
        "kind": "known",
        "unit": "count",
        "value": 2,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 1061,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 1103,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 375,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 2539,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
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
      "district": "Jorhat" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Jorhat West" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 29,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 4688,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 0,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 603,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
        },
        {
          "circle": "Teok" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 15,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 8420,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 1105,
          },
          "reliefCamps": {
            "kind": "known",
            "unit": "count",
            "value": 1,
          },
          "reliefDistributionCentres": {
            "kind": "known",
            "unit": "count",
            "value": 1,
          },
          "campInmates": {
            "kind": "known",
            "unit": "count",
            "value": 19,
          },
          "nonCampInmates": {
            "kind": "known",
            "unit": "count",
            "value": 23,
          },
        },
        {
          "circle": "Titabor" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 3,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 58,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 15,
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
          "circle": "Jorhat East" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 5,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 52,
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
          "circle": "Mariani" as RevenueCircleName,
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
        "kind": "known",
        "unit": "count",
        "value": 52,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 5287,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 5229,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 2650,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 13166,
        },
      },
      "cropAreaSubmerged": {
        "kind": "known",
        "unit": "Hect",
        "value": 1172,
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
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 622,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 259,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 266,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 88,
        },
        "pregnantOrLactating": {
          "kind": "known",
          "unit": "count",
          "value": 6,
        },
        "personsWithDisability": {
          "kind": "known",
          "unit": "count",
          "value": 3,
        },
      },
      "nonCampInmates": {
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 23,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 6,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 8,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 9,
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
            "value": 1089,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 789,
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
          "value": 0.82,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 0.15,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0.05,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 4.5,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Jorhat West - Hand Tube well installed - 11 Nos., Disinfection done of HTW - 34 Nos., Disinfection of PWSS done - 54 Nos.), (Jorhat East - 6 nos. of spot source disinfected and 250 leaflets distributed in the flood affected areas under Jorhat East Revenue Circle by PHE, Jorhat.)",
    },
    {
      "district": "Karbi Anglong" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Phuloni" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 4,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 852,
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
            "value": 852,
          },
        },
        {
          "circle": "Diphu" as RevenueCircleName,
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
        "kind": "known",
        "unit": "count",
        "value": 4,
      },
      "population": {
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 328,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 336,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 188,
        },
        "total": {
          "kind": "known",
          "unit": "count",
          "value": 852,
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
          "value": 852,
        },
        "male": {
          "kind": "known",
          "unit": "count",
          "value": 328,
        },
        "female": {
          "kind": "known",
          "unit": "count",
          "value": 336,
        },
        "children": {
          "kind": "known",
          "unit": "count",
          "value": 188,
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
          "value": 14.21,
        },
        "dal": {
          "kind": "known",
          "unit": "Q",
          "value": 2.55,
        },
        "salt": {
          "kind": "known",
          "unit": "Q",
          "value": 0.77,
        },
        "mustardOil": {
          "kind": "known",
          "unit": "L",
          "value": 77,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
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
      "district": "Lakhimpur" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Narayanpur" as RevenueCircleName,
          "villagesAffected": {
            "kind": "known",
            "unit": "count",
            "value": 7,
          },
          "populationAffected": {
            "kind": "known",
            "unit": "count",
            "value": 0,
          },
          "cropAreaSubmerged": {
            "kind": "known",
            "unit": "Hect",
            "value": 42,
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
          "circle": "North Lakhimpur" as RevenueCircleName,
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
        "kind": "known",
        "unit": "count",
        "value": 7,
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
        "value": 42,
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
            "value": 1885,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 2856,
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
            "value": 2169,
          },
          "small": {
            "kind": "known",
            "unit": "count",
            "value": 3205,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
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
        {
          "circle": "Tingkhong" as RevenueCircleName,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "(Tengakhat - As per the information received from the PHE Department, 13 Nos Hand Tube Wells (HTWs) were disinfected under Tengakhat Revenue Circle on 10.08.2026), (Naharkatia - As per the information received from the PHE Department, 8 Nos Hand Tube Wells (HTWs) were disinfected under Naharkatia Revenue Circle on 10.08.2026), (Dibrugarh West - As per the information received from the PHE Department, 15 Nos Hand Tube Wells (HTWs) were disinfected under Dibrugarh West Revenue Circle on 10.08.2026), (Tingkhong - As per the information received from the PHE Department, 3 Nos Hand Tube Wells (HTWs) were disinfected under Tingkhong Revenue Circle on 10.08.2026), (Moran - As per the information received from the PHE Department, 27 Nos Hand Tube Wells (HTWs) were disinfected under Moran Revenue Circle on 10.08.2026)",
    },
    {
      "district": "Udalguri" as DistrictName,
      "revenueCircles": [
        {
          "circle": "Mazbat" as RevenueCircleName,
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
        "agencies": [
          "0",
        ],
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
          "kind": "unknown",
          "unit": "count",
        },
        "animalsEvacuated": {
          "kind": "known",
          "unit": "count",
          "value": 0,
        },
      },
      "remarks": "Report Generated On: 10-08-2026 08:58 PM",
    },
  ],
  "infrastructureDamage": [
    {
      "damageClass": "road",
      "district": "Golaghat" as DistrictName,
      "circle": "Morongi" as RevenueCircleName,
      "name": "Mithaam Chapori Road",
      "department": "PWD (Roads)",
      "village": "Mithaam Chapori",
      "location": "2nd, 3rd and 4th KM of Mithaam Chapori",
      "coordinate": {
        "kind": "precise",
        "longitude": 93.842552,
        "latitude": 26.581058,
      },
      "remarks": "",
    },
    {
      "damageClass": "road",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "NH 39 to Kordoiguri Road",
      "department": "PWD (Roads)",
      "village": "Kordoiguri Gaon",
      "location": "2nd KM of NH39 to Kordoiguri Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 93.859253,
        "latitude": 26.566116,
      },
      "remarks": "",
    },
    {
      "damageClass": "road",
      "district": "Golaghat" as DistrictName,
      "circle": "Dergaon" as RevenueCircleName,
      "name": "Mamoronipam road",
      "department": "PWD (Roads)",
      "village": "Mamoranipa m",
      "location": "Mamoronipam",
      "coordinate": undefined,
      "remarks": "Mamoronipam road (Submerged) Village Mamoronipam",
    },
    {
      "damageClass": "road",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Joraguri No 1 Dergaon town to Kubal pam road",
      "department": "PWD (Roads)",
      "village": "Kobalpam",
      "location": "Kobalpam",
      "coordinate": undefined,
      "remarks": "Joraguri No 1 Dergaon town to Kubal pam road (Submerged) Village Kobalpam",
    },
    {
      "damageClass": "road",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Pulikoroni to Baliduwa road",
      "department": "PWD (Roads)",
      "village": "Balidowar",
      "location": "Balidowa",
      "coordinate": undefined,
      "remarks": "Pulikoroni to Baliduwa road (Submerged) Village Balidowa",
    },
    {
      "damageClass": "road",
      "district": "Golaghat" as DistrictName,
      "circle": "Bokakhat" as RevenueCircleName,
      "name": "NH-37 TO SONOWAL GAON",
      "department": "PWD (Roads)",
      "village": "parghat Gaon",
      "location": "Parghat",
      "coordinate": undefined,
      "remarks": "Road surface damaged at several stheretches",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "Jorhat West" as RevenueCircleName,
      "name": "Road",
      "department": "PWD (Roads)",
      "village": "Sensua (Sarusarai Mouza)",
      "location": "Deka gaon road",
      "coordinate": undefined,
      "remarks": "Road Name Deka Gaon Road Road Length 750.00 Meter Culvert Damage along with approach road",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Road",
      "department": "PWD (Roads)",
      "village": "Sarusarai Mouza: Dhekorgorah Kumar Gaon",
      "location": "Malowali road",
      "coordinate": undefined,
      "remarks": "Malow ali Road Road length 7 km Slumdown is observed at side shoulder and carriage way portion. Road surface course is deteriorated .",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Road",
      "department": "PWD (Roads)",
      "village": "Sarusarai Mouza: Dhekorgorah Kumar Gaon",
      "location": "Dhekorgorah road",
      "coordinate": undefined,
      "remarks": "Dhekorgorah Road (Remaining part) Length 11.00 km Side shoulder and road surface is damaged due to flood water, urgent intervention is required",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "Teok" as RevenueCircleName,
      "name": "Rupahi Ali connecting Era Gaon",
      "department": "PWD (Roads)",
      "village": "Balijania",
      "location": "Era Gaon, Gakhirkhowa GP",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.431139,
        "latitude": 26.744098,
      },
      "remarks": "",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Pirakota to Chaporichuk Road connecting Road",
      "department": "PWD (Roads)",
      "village": "Mudoijan Bharalua",
      "location": "Pirakota to Chaporichuk",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.38741,
        "latitude": 26.799542,
      },
      "remarks": "1.5 Km",
    },
    {
      "damageClass": "road",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "TBN to Chaporicuk",
      "department": "PWD (Roads)",
      "village": "Pirakata Habi",
      "location": "TBN to Chaporicuk",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.423432,
        "latitude": 26.798274,
      },
      "remarks": "3.75 Km",
    },
    {
      "damageClass": "road",
      "district": "Nagaon" as DistrictName,
      "circle": "Samaguri" as RevenueCircleName,
      "name": "Block Dev. Officer Pachim Kaliabor Dev. Block",
      "department": "P&RD",
      "village": "Gatanga",
      "location": "Gatanga",
      "coordinate": undefined,
      "remarks": "As reported by Block Dev. Officer Pachim Kaliabor Dev. Block, Road cum bund from Kajal das land to Samaguri Beelpar Connecting has been submerged and damaged.",
    },
    {
      "damageClass": "road",
      "district": "Nagaon" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "ASSISTANT EXECUTIVE ENGINEER, PWRD, KALIABOR TERRITORIAL ROAD SUB-DIVISION, JAKHALABANDHA",
      "department": "PWD (Roads)",
      "village": "Sialekhati",
      "location": "SIALEKHATI",
      "coordinate": undefined,
      "remarks": "AS REPORTED BY ASSISTANT EXECUTIVE ENGINEER, PWRD, KALIABOR TERRITORIAL ROAD SUB-DIVISION, JAKHALABANDHA, DUE TO CONTINUOUS HEAVY RAINFALL IN THE LAST COUPLE OF DAYS, A PORTION OF ROAD AT SHIALEKHAITY AT 1 KM FROM AMONI CENTRE HAVE BEEN FLOODED BY THE OVERFLOWING DIJU RIVER. DETAILED ASSESSMENT OF DAMAGES WILL BE DONE AFTER THE RECESSION OF FLOODWATERS FROM THE ROAD.",
    },
    {
      "damageClass": "road",
      "district": "Nagaon" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Block Dev. Officer Pachim Kaliabor Dev. Block",
      "department": "P&RD",
      "village": "Gatanga",
      "location": "GATANGA",
      "coordinate": undefined,
      "remarks": "As reported by Block Dev. Officer Pachim Kaliabor Dev. Block, a road cum bund from NH-37 to Gatanga Jame Masjid connecting with single row culvert has been submerged and damaged.",
    },
    {
      "damageClass": "road",
      "district": "Nagaon" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Block Dev. Officer Pachim Kaliabor Dev. Block",
      "department": "P&RD",
      "village": "Khalihamari",
      "location": "Khalihamari",
      "coordinate": undefined,
      "remarks": "As reported by Block Dev. Officer Pachim Kaliabor Dev. Block, Road cum bund from Khalihamari RCC bridge to Hal uddin land has been submerged and damaged.",
    },
    {
      "damageClass": "road",
      "district": "Nagaon" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Block Dev. Officer Pachim Kaliabor Dev. Block",
      "department": "P&RD",
      "village": "Khalihamari",
      "location": "Khalihamari",
      "coordinate": undefined,
      "remarks": "As reported by Block Dev. Officer Pachim Kaliabor Dev. Block, Road cum bund from PWD road to Khalihamari Hanuman Mandir Connecting has been submerged and damaged.",
    },
    {
      "damageClass": "road",
      "district": "Nagaon" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "ASSISTANT EXECUTIVE ENGINEER, PWRD, KALIABOR TERRITORIAL ROAD SUB-DIVISION, JAKHALABANDHA",
      "department": "PWD (Roads)",
      "village": "Rangagara Gaon",
      "location": "RANGAGARA,BHUMURA GURI",
      "coordinate": undefined,
      "remarks": "DUE TO CONTINUOUS HEAVY RAINFALL IN THE LAST COUPLE OF DAYS, A PORTION OF ROAD AT 2 NO. BHUMURAGURI GAON AT 3RD KM FROM ASSAM TRUNK ROAD AT RANGAGORAH HAVE BEEN FLOODED BY THE OVERFLOWING DIJU RIVER. DETAILED ASSESSMENT OF DAMAGES WILL BE DONE AFTER THE RECESSION OF FLOODWATERS FROM THE ROAD.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "Amguri" as RevenueCircleName,
      "name": "Namti Ali to Rotia Chuk",
      "department": "PWD (Roads)",
      "village": "Basasayak Dibrual",
      "location": "Basasayak Dibrual",
      "coordinate": undefined,
      "remarks": "Road damaged by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Amguri Tea Estate",
      "department": "PWD (Roads)",
      "village": "Haluwadang Grant",
      "location": "Haluwadang Grant",
      "coordinate": undefined,
      "remarks": "Silt Accumulation on road by flood.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Bortol Japihajia",
      "department": "PWD (Roads)",
      "village": "Lalimsiga Chapori",
      "location": "Lalimchiga",
      "coordinate": undefined,
      "remarks": "Road damaged by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Namti Ali",
      "department": "PWD (Roads)",
      "village": "Dhepor Mridongia",
      "location": "Dhepor Mridongia",
      "coordinate": undefined,
      "remarks": "Road damaged by flood water.",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "Nazira" as RevenueCircleName,
      "name": "Phulonibari Krisipam road",
      "department": "PWD (Roads)",
      "village": "Methonchuw a Grant",
      "location": "Methonsuwa Grant",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "road",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Galakey Ali Near Hatiputy kolgaon",
      "department": "PWD (Roads)",
      "village": "Hatipatty Grant",
      "location": "Hatiputy grant",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "bridge",
      "district": "Sivasagar" as DistrictName,
      "circle": "Amguri" as RevenueCircleName,
      "name": "Ahom Bridge",
      "department": "PWD (Roads)",
      "village": "Haluwadang Grant",
      "location": "Amguri TE (Ahom Bridge) (Both End)",
      "coordinate": undefined,
      "remarks": "Bridge damaged by flood.",
    },
    {
      "damageClass": "embankment-affected",
      "district": "Nagaon" as DistrictName,
      "circle": "Samaguri" as RevenueCircleName,
      "name": "Block Dev. Officer Pachim Kaliabor Dev. Block",
      "department": "P&RD",
      "village": "Bhumuraguri",
      "location": "Bhumuraguri",
      "coordinate": undefined,
      "remarks": "As reported by Block Dev. Officer Pachim Kaliabor Dev. Block, Agril bund from Riaj uddin house to merbeel sluice gate connecting. has been submerged and damaged",
    },
    {
      "damageClass": "other",
      "district": "Charaideo" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "LUKHURAKH",
      "department": "Education",
      "village": "Lukhurkhan",
      "location": "SNR",
      "coordinate": {
        "kind": "precise",
        "longitude": 95.1351,
        "latitude": 27.04827,
      },
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Charaideo" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "AN GARUKHUA LPS",
      "department": "Deptt.",
      "village": "Gaon",
      "location": "",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Darrang" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "PWSS",
      "department": "PHE",
      "village": "Mathanga",
      "location": "Mathanga",
      "coordinate": undefined,
      "remarks": "As per report received from PHE, Mangaldai Division 01 no of PWSS has been damaged due to flood on 10-08- 2026",
    },
    {
      "damageClass": "other",
      "district": "Darrang" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "PWSS",
      "department": "PHE",
      "village": "Ahaka Chuburi",
      "location": "Ahaka (Outala)",
      "coordinate": undefined,
      "remarks": "As per report received from PHE, Mangaldai Division 01 no of PWSS has been damaged due to flood on 10-08- 2026",
    },
    {
      "damageClass": "other",
      "district": "Darrang" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "PWSS",
      "department": "PHE",
      "village": "Bengabora Chuburi",
      "location": "Bengabora Chuburi Village",
      "coordinate": undefined,
      "remarks": "As per report received from PHE, Mangaldai Division 01 no of PWSS has been damaged due to flood on 10-08- 2026",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fishery",
      "department": "Fishery",
      "village": "Kathkotia (Moukhowa Mouza)",
      "location": "kathkotia gaon and Habial gaon",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "JORAGURI",
      "department": "Education",
      "village": "No.2 Joraguri",
      "location": "No.2 Joraguri",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "SHOMONIA LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "OBHOTA",
      "department": "Education",
      "village": "Dergaon",
      "location": "Obhata Chapori",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "CHAPORI LPS (NEW)",
      "department": "Deptt.",
      "village": "gaon",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "BALI DUWAR",
      "department": "Education",
      "village": "Balidowar",
      "location": "Balidowar",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "HAHCHOWA",
      "department": "Education",
      "village": "Dakhin",
      "location": "Dakhin Dolijalia",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "MES",
      "department": "Deptt.",
      "village": "Dolijalia",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "AMANI PAM",
      "department": "Education",
      "village": "Uttar",
      "location": "Uttar Dolijolia",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "ADARSHA LPS",
      "department": "Deptt.",
      "village": "Dolijolia",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "KOROIANI",
      "department": "Education",
      "village": "Koraianibhak",
      "location": "Koroiani Bhakat Gaon",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "LPS",
      "department": "Deptt.",
      "village": "at",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "KUHIMARI",
      "department": "Education",
      "village": "Balidowar",
      "location": "Balidowar",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "SANKAR DEV LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "DESOI PORIA",
      "department": "Education",
      "village": "Danichapori",
      "location": "Danichapori",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "MISSING LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "BIRINGA",
      "department": "Education",
      "village": "Kumaliachap",
      "location": "Kumolia Chapori",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "MIRI GOVT JBS",
      "department": "Deptt.",
      "village": "ori",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "PULI",
      "department": "Education",
      "village": "Pulikaraiani",
      "location": "Pulikaraiani",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "KORYANI MOJDOR LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "KARAYANI",
      "department": "Education",
      "village": "Koraianibhak",
      "location": "Koroiani Bhakat Gaon",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "HIGH SCHOOL",
      "department": "Deptt.",
      "village": "at",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1 NO",
      "department": "Education",
      "village": "No.1 Joraguri",
      "location": "No1 Joraguri",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "JARAGURI LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus ,Classroom and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1 NO.",
      "department": "Education",
      "village": "No.1 Joraguri",
      "location": "No1 Joraguri",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "JORAGURI TEMERA LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "KHAKANDA",
      "department": "Education",
      "village": "No.2",
      "location": "No.2 Khokond Guri",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "GURI MES",
      "department": "Deptt.",
      "village": "Khakandagur i",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "JARAGURI",
      "department": "Education",
      "village": "No.1 Joraguri",
      "location": "No1 Joraguri",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "SANKAR MADHAB MES",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "GELABIL",
      "department": "Education",
      "village": "dergaon",
      "location": "Dergaon (TC) - Ward No.2",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "ABHYOSON LPS",
      "department": "Deptt.",
      "village": "town",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Classroom",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "KOROYANI",
      "department": "Education",
      "village": "Pulikaraiani",
      "location": "Pulikaraiani",
      "coordinate": undefined,
      "remarks": "Flood Entered in",
    },
    {
      "damageClass": "other",
      "district": "Golaghat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "BONUA BOSTI LPS",
      "department": "Deptt.",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "the School Campus and Kitchen",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fish Pond affected",
      "department": "Fishery",
      "village": "Abhoypuria",
      "location": "16 No Uttar Pub Nakachari GP Villages are- Darikial Gaon, Ghorfolia Mailbelia, Maibelia, Borgaon, Aag Chamua, Pachchamua, Rajbari Gaon, Abhoipuria Gaon, Ujani Rajbari, Dohotia, Bolimara, Bolimara Maran Gaon, Maran gaon, Tirualgaon, Station tiniali, Machkhowa, Eragaon, Bura bolimara, Deberapar",
      "coordinate": undefined,
      "remarks": "52 fish ponds are affected as reported by FDO",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fish Pond Affected",
      "department": "Fishery",
      "village": "Morongial Gaon",
      "location": "15 Madhya Nakacahari GP Villages are- Aphalamukh, Bhelauguri, Ratanpur Gaon, Triualbheta, Hollung guri, Deberapar, Kalia gaon, Marangia, 163 no Grant, Chinatali, Dihingia Gaon",
      "coordinate": undefined,
      "remarks": "44 fish ponds affected as reported by FDO.",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Malowpam",
      "department": "Fishery",
      "village": "Malowpam",
      "location": "44 No. Madhya Sarucharai",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Ajan Bamun",
      "department": "Fishery",
      "village": "Aajan Bamun",
      "location": "67 No. Panichukua",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Nahatia",
      "department": "Fishery",
      "village": "Na Hatia",
      "location": "38 No. Baligaon",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Gayan Gaon",
      "department": "Fishery",
      "village": "Gayan Gaon",
      "location": "38 No. Baligaon",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Kalian Pathar",
      "department": "Fishery",
      "village": "Sakalani Pathar",
      "location": "38 No. Baligaon",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Bhorakola",
      "department": "Fishery",
      "village": "1 No Bhurakola",
      "location": "47 No. Dakshin Parbatia",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Nam Deuri",
      "department": "Fishery",
      "village": "Naam Deuri",
      "location": "39 No. Uttar Parbatia",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Bahek gaon",
      "department": "Fishery",
      "village": "Bahek",
      "location": "70 No. Madhya khongia",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Puranimati",
      "department": "Fishery",
      "village": "Purani Mati Satra",
      "location": "46 No. Charingia",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Randhanijan",
      "department": "Fishery",
      "village": "Randhanijan",
      "location": "47 No. Dakhin Parbatia",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "1 No. Sonari",
      "department": "Fishery",
      "village": "1 No Sonari",
      "location": "39 No. Uttar Parbatia",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Mpnai Maji PWSS",
      "department": "PHE",
      "village": "Sarbaibandh a",
      "location": "MONAIMAJI",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.13858,
        "latitude": 26.77426,
      },
      "remarks": "150 MM Sluice vulb damaged,supportin g piller of GI Pipeline damaged, depression of site occured.",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Kalbari Bashi Pathar PWSS",
      "department": "PHE",
      "village": "2 No Bhalukmara Grant",
      "location": "Bashi Pathar",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.09526,
        "latitude": 26.65863,
      },
      "remarks": "Distribution pipe network and crossing of culvert damaged, pump set are submerged and defunct, FHTC damaged.",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Gualjan Mini PWSS",
      "department": "PHE",
      "village": "Gualjan",
      "location": "Gualjan",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.0958,
        "latitude": 26.7643,
      },
      "remarks": "All scheme submerged.",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Dhapkota Charingia PWSS",
      "department": "PHE",
      "village": "Charingia (Charaibahi Mouza)",
      "location": "Dhapkota Charingia",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.146198,
        "latitude": 26.732614,
      },
      "remarks": "Distribution line damaged, crossing point damaged, vulb damaged.",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Socalating PWSS",
      "department": "PHE",
      "village": "Sokolating Grant",
      "location": "Socalating",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.05709,
        "latitude": 26.68032,
      },
      "remarks": "Distribution line damaged, Sluice vulb damaged, GI crossing damaged, FACC damaged.",
    },
    {
      "damageClass": "other",
      "district": "Jorhat" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Mohimabari Rongali Bari PWSS",
      "department": "PHE",
      "village": "Mohima Bari Gaon",
      "location": "Mohimabari Rongali Bari",
      "coordinate": undefined,
      "remarks": "LDS damaged, CWPM damaged.",
    },
    {
      "damageClass": "other",
      "district": "Karbi Anglong" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Hume pipe",
      "department": "PWD",
      "village": "Hidipi",
      "location": "Chalakathar, Hidipi",
      "coordinate": {
        "kind": "approximate",
        "longitude": 93.64,
        "latitude": 25.99835,
        "reason": "insufficient-precision",
      },
      "remarks": "Hume pipe Culvert",
    },
    {
      "damageClass": "other",
      "district": "Karbi Anglong" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Culvert along with head wall at Culvert No. 3/1",
      "department": "(Roads)",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "along with head wall Culvert No. 3/1 on road from Hidipi Bazar to Chalakathar washed away existing cushion and crust of 4 rows 1000mm dia H/pipe, damaged length- 8.00 Rm due to flash flood on 09/08/2026 under PWD Borpathar Roads Division.",
    },
    {
      "damageClass": "other",
      "district": "Karbi Anglong" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fishery Damage",
      "department": "Fishery",
      "village": "Bahoni Adorsha",
      "location": "Bahoni Adorsha",
      "coordinate": {
        "kind": "precise",
        "longitude": 93.175038,
        "latitude": 26.078137,
      },
      "remarks": "7 pond was damaged due to flash flood on dated 08/08/2026.The pond under fishary dept.Diphu",
    },
    {
      "damageClass": "other",
      "district": "Karbi Anglong" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fishery Damage",
      "department": "Fishery",
      "village": "Selabor N:C",
      "location": "Lakhan Bey,Jaipong",
      "coordinate": {
        "kind": "precise",
        "longitude": 93.1937,
        "latitude": 26.229954,
      },
      "remarks": "3 pond was damaged due to flash flood on dated 08/08/2026.The pond under fishary dept.Diphu",
    },
    {
      "damageClass": "other",
      "district": "Karbi Anglong" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fishery Damage",
      "department": "Fishery",
      "village": "Kekang Pothar",
      "location": "Singar Camp",
      "coordinate": {
        "kind": "precise",
        "longitude": 93.176429,
        "latitude": 26.218512,
      },
      "remarks": "39 pond was damaged due to flash flood on dated 08/08/2026.The pond under fishary dept.Diphu",
    },
    {
      "damageClass": "other",
      "district": "Lakhimpur" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Bamboo Foot Bridge",
      "department": "PWD (Roads)",
      "village": "Kandali Pathar",
      "location": "Bocha gaon to Bhimpora Mothauri via Kandali",
      "coordinate": undefined,
      "remarks": "As per report recieved from",
    },
    {
      "damageClass": "other",
      "district": "Nagaon" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Block Dev. Officer Pachim Kaliabor Dev. Block",
      "department": "P&RD",
      "village": "Gatanga",
      "location": "Gatanga",
      "coordinate": undefined,
      "remarks": "As reported by the Block Dev. Officer Pachim Kaliabor Dev. BlockGatanga Lalghat Sluice Gate has been submerged and damaged",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Amguri Fire",
      "department": "PWD",
      "village": "Amguri Town",
      "location": "Amguri Town Ward No-4",
      "coordinate": {
        "kind": "precise",
        "longitude": 94.5178,
        "latitude": 26.81104,
      },
      "remarks": "Amguri Fire and",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "and Emergency Service Station",
      "department": "Building",
      "village": "Ward No-4",
      "location": "",
      "coordinate": undefined,
      "remarks": "Emergency Service Station building, furniture and office utility damage due to Flood.",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Basbari PWSS",
      "department": "PHE",
      "village": "Rajabhata 1",
      "location": "Rajabheta 1",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Chuladhara",
      "department": "PHE",
      "village": "Chuladhara",
      "location": "chuladhara",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Sivasagar" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Kenduguri PWSS",
      "department": "",
      "village": "",
      "location": "",
      "coordinate": undefined,
      "remarks": "",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fishery Pond Affected",
      "department": "Fishery",
      "village": "Benenabari Jungle",
      "location": "Bengenabari Jungle",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.283636,
        "latitude": 26.676095,
      },
      "remarks": "A pond covering an area of 2.5 hectares has been affected due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fishery pond affected",
      "department": "Fishery",
      "village": "Dhupguri",
      "location": "Dhupguri",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.30524,
        "latitude": 26.661158,
      },
      "remarks": "A pond covering an area of 0.84 hectare has been affected due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Fishery popnd affected",
      "department": "Fishery",
      "village": "Phuhurabari",
      "location": "Phuhurabari",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.276628,
        "latitude": 26.737987,
      },
      "remarks": "A pond covering an area of 1 hectare has been affected due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Transformer",
      "department": "APDCL",
      "village": "Jingabil",
      "location": "Swrangajuli",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.258387,
        "latitude": 26.876146,
      },
      "remarks": "1 nos. of Power Dept. transformer have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Palashbasti",
      "location": "Palasbasti",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.28524,
        "latitude": 26.759032,
      },
      "remarks": "A length of 0.200km of",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Jagyapur",
      "location": "Jagyapur",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.32335,
        "latitude": 26.834002,
      },
      "remarks": "A length of 0.400km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Lamabari Bagan",
      "location": "Handanguri",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.246179,
        "latitude": 26.858731,
      },
      "remarks": "A length of 0.150km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Khusurabari",
      "location": "Khusurabari (Ramgarh)",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.293315,
        "latitude": 26.826159,
      },
      "remarks": "A length of 3.5km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Khusurabari",
      "location": "Khusurabari",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.307672,
        "latitude": 26.813367,
      },
      "remarks": "A length of 1.5km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Lamabari Bagan",
      "location": "Bhagalpur",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.303725,
        "latitude": 26.900571,
      },
      "remarks": "A length of 2.00km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Botabari",
      "location": "Batabari",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.294695,
        "latitude": 26.781822,
      },
      "remarks": "A length of 0.200km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Jingabil",
      "location": "Milaipur (Jingabil)",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.311518,
        "latitude": 26.810307,
      },
      "remarks": "A length of 2.00km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Chubura Chuburi Pathar",
      "location": "Chubura Chuburi",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.287822,
        "latitude": 26.663248,
      },
      "remarks": "A length of 0.800km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Botabari",
      "location": "Batabari",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.286613,
        "latitude": 26.761969,
      },
      "remarks": "A length of 0.150km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Snapping of Conductor",
      "department": "APDCL",
      "village": "Khoramakha",
      "location": "Khoramakha",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.298033,
        "latitude": 26.798664,
      },
      "remarks": "A length of 0.900km of conductor is damaged due to flood occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Khoramakha",
      "location": "Khoramakha",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.298033,
        "latitude": 26.798664,
      },
      "remarks": "1 Nos. of Poles have been damaged due to food occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Botabari",
      "location": "Batabari",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.294695,
        "latitude": 26.781822,
      },
      "remarks": "1 Nos. of Pole have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Khusurabari",
      "location": "Khusurabari",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.308043,
        "latitude": 26.81757,
      },
      "remarks": "3 Nos. of Poles have been damaged due to food occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Jagyapur",
      "location": "Jagyapur",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.32335,
        "latitude": 26.834002,
      },
      "remarks": "1 Nos. of Poles have been damaged due to food occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Lamabari Bagan",
      "location": "Handanguri",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.246179,
        "latitude": 26.858731,
      },
      "remarks": "1 Nos. of Pole have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Khusurabari",
      "location": "Ramgarh (Khusurabari)",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.292807,
        "latitude": 26.825542,
      },
      "remarks": "8 Nos. of Poles have been damaged due to food occurred on 05.08.2026",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "damaged of poles",
      "department": "APDCL",
      "village": "Botabari",
      "location": "Batabari",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.286613,
        "latitude": 26.761969,
      },
      "remarks": "1 Nos. of Pole have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Palashbasti",
      "location": "Palashbasti",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.28524,
        "latitude": 26.759032,
      },
      "remarks": "1 Nos. of Pole have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Jingabil",
      "location": "Milaipur (Jingabil)",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.311518,
        "latitude": 26.810307,
      },
      "remarks": "10 Nos. of Pole have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of poles",
      "department": "APDCL",
      "village": "Chubura Chuburi Pathar",
      "location": "Chubura Chuburi",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.287822,
        "latitude": 26.663248,
      },
      "remarks": "4 Nos. of Pole have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "Damaged of Poles",
      "department": "APDCL",
      "village": "Lamabari Bagan",
      "location": "Bhagalpur",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.303725,
        "latitude": 26.900571,
      },
      "remarks": "4 Nos. of Pole have been damaged due to flood occurred on 05.08.2026.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "RCC Slab Culvert washed out",
      "department": "PWD (Roads)",
      "village": "Chubura Chuburi Pathar",
      "location": "Dhanshrighat Chubura Chuburi Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.285663,
        "latitude": 26.663019,
      },
      "remarks": "Due to incessant rain for last few days and flood occurred on 05.08.2026, RCC Slab Culvert no 3/1 on Dhanshrighat Chubura Chuburi Road washed out and approach washed out both side approx 400m.",
    },
    {
      "damageClass": "other",
      "district": "Udalguri" as DistrictName,
      "circle": "" as RevenueCircleName,
      "name": "RCC Slab Culvert Washed out",
      "department": "PWD (Roads)",
      "village": "No.2 Sonapur FV",
      "location": "Adarsha Dwimuguri to Deobar Bazar Road",
      "coordinate": {
        "kind": "precise",
        "longitude": 92.275475,
        "latitude": 26.861726,
      },
      "remarks": "Due to incessant rain for last few days and flood occurred on 05.08.2026 RCC Slab culvert of Adarsha Dwimuguri to Deobar Bazar road washed out and approach washed out both side approx 100m",
    },
  ],
  "statewideTotals": {
    "districtsAffected": {
      "kind": "known",
      "unit": "count",
      "value": 10,
    },
    "revenueCirclesAffected": {
      "kind": "known",
      "unit": "count",
      "value": 25,
    },
    "villagesAffected": {
      "kind": "known",
      "unit": "count",
      "value": 458,
    },
    "populationAffected": {
      "kind": "known",
      "unit": "count",
      "value": 126431,
    },
    "cropAreaSubmerged": {
      "kind": "known",
      "unit": "Hect",
      "value": 11287.04,
    },
    "reliefCamps": {
      "kind": "known",
      "unit": "count",
      "value": 48,
    },
    "reliefDistributionCentres": {
      "kind": "known",
      "unit": "count",
      "value": 41,
    },
    "campInmates": {
      "kind": "known",
      "unit": "count",
      "value": 8447,
    },
    "nonCampInmates": {
      "kind": "known",
      "unit": "count",
      "value": 15563,
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
        3,
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
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "animals-affected",
      "sourcePages": [
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "animals-washed-away",
      "sourcePages": [
        4,
      ],
      "confidence": "high",
    },
    {
      "kind": "houses-damaged",
      "sourcePages": [
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
        5,
      ],
      "confidence": "high",
    },
    {
      "kind": "relief-distributed",
      "sourcePages": [
        5,
      ],
      "confidence": "high",
    },
    {
      "kind": "relief-distributed-others",
      "sourcePages": [
        5,
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
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-bridge",
      "sourcePages": [
        8,
        9,
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-embankment-breached",
      "sourcePages": [
        9,
        10,
      ],
      "confidence": "high",
    },
    {
      "kind": "infrastructure-embankment-affected",
      "sourcePages": [
        10,
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
      ],
      "confidence": "high",
    },
    {
      "kind": "remarks",
      "sourcePages": [
        17,
        18,
      ],
      "confidence": "high",
    },
  ],
  "reconciliationFailures": [],
};
