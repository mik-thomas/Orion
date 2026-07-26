import { useEffect, useState } from "react";
import { listCourthouses, updateMagistrate } from "../api/magistrates";
import { ApiError } from "../api/http";
import type { Courthouse, MagistrateDetail } from "../types/domain";

export function SittingLocationsEditor({
  magistrateId,
  sittingLocations,
  editable = true,
  onUpdated,
}: {
  magistrateId: number;
  sittingLocations: Courthouse[];
  editable?: boolean;
  onUpdated: (magistrate: MagistrateDetail) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [courthouses, setCourthouses] = useState<Courthouse[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    sittingLocations.map((court) => court.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editing) return;
    listCourthouses()
      .then(setCourthouses)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Failed to load courthouses")
      );
  }, [editing]);

  const label =
    sittingLocations.length > 0
      ? sittingLocations.map((court) => court.name).join(", ")
      : "None recorded";

  if (!editable) {
    return <span>{label}</span>;
  }

  async function persist(ids: number[]) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMagistrate(magistrateId, {
        sitting_location_ids: ids,
      });
      onUpdated(updated);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="orion-loa-review-editor">
        <span>{label}</span>
        {saved && (
          <p className="govuk-body-s govuk-!-margin-bottom-0 orion-loa-review-editor__saved" role="status">
            Saved
          </p>
        )}
        <div className="orion-loa-review-editor__actions">
          <button
            type="button"
            className="govuk-link orion-loa-review-editor__change"
            onClick={() => {
              setSelectedIds(sittingLocations.map((court) => court.id));
              setError(null);
              setSaved(false);
              setEditing(true);
            }}
          >
            {sittingLocations.length > 0 ? "Change" : "Add"}
          </button>
          {sittingLocations.length > 0 ? (
            <button
              type="button"
              className="govuk-link orion-loa-review-editor__change"
              disabled={saving}
              onClick={() => void persist([])}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="orion-loa-review-editor orion-loa-review-editor--editing">
      <fieldset className="govuk-fieldset">
        <legend className="govuk-fieldset__legend govuk-fieldset__legend--s">
          Sitting locations
        </legend>
        <div className="govuk-checkboxes govuk-checkboxes--small">
          {courthouses.map((court) => {
            const checked = selectedIds.includes(court.id);
            return (
              <div className="govuk-checkboxes__item" key={court.id}>
                <input
                  className="govuk-checkboxes__input"
                  id={`sitting-loc-${magistrateId}-${court.id}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedIds((current) =>
                      checked
                        ? current.filter((id) => id !== court.id)
                        : [...current, court.id]
                    );
                  }}
                />
                <label
                  className="govuk-label govuk-checkboxes__label"
                  htmlFor={`sitting-loc-${magistrateId}-${court.id}`}
                >
                  {court.name}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      {error && (
        <p className="govuk-error-message govuk-!-margin-bottom-2">
          <span className="govuk-visually-hidden">Error:</span>
          {error}
        </p>
      )}
      <div className="orion-loa-review-editor__actions">
        <button
          type="button"
          className="govuk-button govuk-!-margin-bottom-0"
          disabled={saving}
          onClick={() => void persist(selectedIds)}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
          disabled={saving}
          onClick={() => void persist([])}
        >
          Clear
        </button>
        <button
          type="button"
          className="govuk-link orion-loa-review-editor__cancel"
          disabled={saving}
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
