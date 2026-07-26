import { useEffect, useState } from "react";
import { listCourthouses, updateMagistrate } from "../api/magistrates";
import { ApiError } from "../api/http";
import type { Courthouse, MagistrateDetail } from "../types/domain";

export function HomeCourtEditor({
  magistrateId,
  homeCourthouse,
  editable = true,
  onUpdated,
}: {
  magistrateId: number;
  homeCourthouse: Courthouse | null;
  editable?: boolean;
  onUpdated: (magistrate: MagistrateDetail) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [courthouses, setCourthouses] = useState<Courthouse[]>([]);
  const [draftId, setDraftId] = useState(homeCourthouse ? String(homeCourthouse.id) : "");
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

  const label = homeCourthouse?.name ?? "Not recorded";

  if (!editable) {
    return <span>{label}</span>;
  }

  async function persist(nextId: number | null) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMagistrate(magistrateId, {
        home_courthouse_id: nextId,
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
              setDraftId(homeCourthouse ? String(homeCourthouse.id) : "");
              setError(null);
              setSaved(false);
              setEditing(true);
            }}
          >
            {homeCourthouse ? "Change" : "Add"}
          </button>
          {homeCourthouse ? (
            <button
              type="button"
              className="govuk-link orion-loa-review-editor__change"
              disabled={saving}
              onClick={() => void persist(null)}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const inputId = `home-court-${magistrateId}`;

  return (
    <div className="orion-loa-review-editor orion-loa-review-editor--editing">
      <div className="govuk-form-group govuk-!-margin-bottom-2">
        <label className="govuk-label govuk-label--s" htmlFor={inputId}>
          Home court
        </label>
        <select
          className="govuk-select"
          id={inputId}
          value={draftId}
          onChange={(event) => setDraftId(event.target.value)}
        >
          <option value="">Not recorded</option>
          {courthouses.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name}
            </option>
          ))}
        </select>
      </div>
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
          onClick={() => void persist(draftId ? Number(draftId) : null)}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
          disabled={saving}
          onClick={() => void persist(null)}
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
