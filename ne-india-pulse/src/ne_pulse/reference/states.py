"""Reference Data context: the 8 North East Indian states.

Static, authoritative geography/demographics used for labelling and per-capita
context. Sources: Census 2011 (ORGI) + research notes (docs/research/02-*).
FIPS-10-4 ADM1 codes verified empirically against live GDELT GKG data.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class State:
    fips: str          # FIPS 10-4 ADM1 code == GDELT ADM1Code (join key)
    iso: str           # ISO 3166-2:IN
    name: str
    capital: str
    population_2011: int


# Keyed by FIPS code (the code GDELT stores). Order: largest population first.
NE_STATES: dict[str, State] = {
    s.fips: s
    for s in (
        State("IN03", "IN-AS", "Assam", "Dispur", 31_205_576),
        State("IN26", "IN-TR", "Tripura", "Agartala", 3_673_917),
        State("IN18", "IN-ML", "Meghalaya", "Shillong", 2_966_889),
        State("IN17", "IN-MN", "Manipur", "Imphal", 2_855_794),
        State("IN20", "IN-NL", "Nagaland", "Kohima", 1_978_502),
        State("IN30", "IN-AR", "Arunachal Pradesh", "Itanagar", 1_383_727),
        State("IN31", "IN-MZ", "Mizoram", "Aizawl", 1_097_206),
        State("IN29", "IN-SK", "Sikkim", "Gangtok", 610_577),
    )
}

NE_FIPS_CODES: frozenset[str] = frozenset(NE_STATES)
REGION_POPULATION_2011: int = sum(s.population_2011 for s in NE_STATES.values())


def is_ne_state(fips: str) -> bool:
    return fips in NE_STATES


def name_for(fips: str) -> str:
    state = NE_STATES.get(fips)
    return state.name if state else fips
