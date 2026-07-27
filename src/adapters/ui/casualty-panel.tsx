/**
 * Casualties (FR-2.9).
 *
 * ASDMA reports Flood Death and General Drowning (Non Flood) as separate
 * figures. Summing them overstates flood mortality (PRD §4.2), so this panel
 * puts them in physically separate cells divided by a rule, gives each its own
 * label, and renders no total anywhere. `Casualties` in the published language
 * has no `total` field; this component is the UI half of the same guarantee.
 */

import { Provenance } from './provenance';
import { formatQuantity, type CasualtiesViewModel, type ProvenanceRef } from './view-models';

export type CasualtyPanelProps = {
  readonly casualties: CasualtiesViewModel;
  /** e.g. "Statewide" or a District name. */
  readonly scope?: string;
  readonly onOpenPage?: (page: number, source: ProvenanceRef) => void;
};

export const CasualtyPanel = ({ casualties, scope, onOpenPage }: CasualtyPanelProps) => (
  <section className="panel" aria-labelledby="casualties-heading">
    <div className="panel__head">
      <h2 className="panel__title" id="casualties-heading">
        Human Lives Lost{scope ? ` — ${scope}` : ''}
      </h2>
      {casualties.confirmedProvenance ? (
        <Provenance source={casualties.confirmedProvenance} onOpenPage={onOpenPage} />
      ) : null}
    </div>

    <div className="casualties">
      <div className="casualties__block">
        <span className="casualties__label">Flood Death</span>
        <span className="casualties__value figure" data-figure="flood-deaths">
          {formatQuantity(casualties.floodDeaths)}
        </span>
        <p className="text-micro text-muted">Confirmed, attributed to the flood</p>
      </div>

      <div className="casualties__block">
        <span className="casualties__label">General Drowning (Non Flood)</span>
        <span className="casualties__value figure" data-figure="general-drownings">
          {formatQuantity(casualties.generalDrownings)}
        </span>
        <p className="text-micro text-muted">Confirmed, not attributed to the flood</p>
      </div>
    </div>

    <div className="casualties__missing">
      <span className="casualties__label">Human Lives Lost — Missing</span>
      <span className="casualties__value figure" data-figure="missing">
        {formatQuantity(casualties.missing)}
      </span>
      {casualties.missingProvenance ? (
        <Provenance source={casualties.missingProvenance} onOpenPage={onOpenPage} />
      ) : null}
    </div>

    <p className="text-small text-muted" style={{ marginTop: 'var(--s-2)' }}>
      ASDMA reports these figures separately. This console never adds them together: a
      General Drowning (Non Flood) is not a flood death, and Missing is not Confirmed.
    </p>
  </section>
);
