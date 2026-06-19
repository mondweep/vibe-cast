from __future__ import annotations

from ne_pulse.reference.states import (
    NE_FIPS_CODES,
    NE_STATES,
    REGION_POPULATION_2011,
    is_ne_state,
    name_for,
)


def test_eight_ne_states_present() -> None:
    assert len(NE_STATES) == 8
    assert {"IN03", "IN17", "IN18", "IN20", "IN26", "IN29", "IN30", "IN31"} == NE_FIPS_CODES


def test_assam_reference_data() -> None:
    assam = NE_STATES["IN03"]
    assert assam.name == "Assam" and assam.iso == "IN-AS"
    assert assam.population_2011 == 31_205_576


def test_region_population_matches_research_total() -> None:
    assert REGION_POPULATION_2011 == 45_772_188  # verified in docs/research/02


def test_lookup_helpers() -> None:
    assert is_ne_state("IN03") and not is_ne_state("IN16")
    assert name_for("IN31") == "Mizoram"
    assert name_for("IN99") == "IN99"  # unknown falls back to the code
