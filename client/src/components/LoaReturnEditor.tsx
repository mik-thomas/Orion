import { useState } from "react";
import { updateLeaveOfAbsence } from "../api/leaves";
import { ApiError } from "../api/http";
import type { LeaveOfAbsence } from "../types/domain";

interface LoaReturnEditorProps {
  leave: LeaveOfAbsence;
  onUpdated: (leave: LeaveOfAbsence) => void;
  editable?: boolean;
}

export function LoaReturnEditor({ leave, onUpdated, editable = true }: LoaReturnEditorProps) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(leave.returned_on ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const ended = !leave.active && leave.ends_on != null;

  if (!editable || (!ended && !leave.returned_on)) {
    return leave.returned_on ? (
      <span>{leave.returned_on}</span>
    ) : ended ? (
      <strong className="govuk-tag govuk-tag--red">Not recorded</strong>
    ) : (
      <span>—</span>
    );
  }

  if (!editing) {
    return (
      <div className="orion-loa-review-editor">
        {leave.returned_on ? (
          <span>{leave.returned_on}</span>
        ) : (
          <strong className="govuk-tag govuk-tag--red">Not recorded</strong>
        )}
        {saved && (
          <p className="govuk-body-s govuk-!-margin-bottom-0 orion-loa-review-editor__saved" role="status">
            Saved
          </p>
        )}
        <button
          type="button"
          className="govuk-link orion-loa-review-editor__change"
          onClick={() => {
            setDate(leave.returned_on ?? leave.ends_on ?? "");
            setError(null);
            setSaved(false);
            setEditing(true);
          }}
        >
          {leave.returned_on ? "Change" : "Record return"}
        </button>
      </div>
    );
  }

  async function handleSave() {
    if (!date) {
      setError("Enter a return date");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateLeaveOfAbsence(leave.magistrate_id, leave.id, {
        returned_on: date,
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

  return (
    <div className="orion-loa-review-editor orion-loa-review-editor--editing">
      <div className="govuk-form-group govuk-!-margin-bottom-2">
        <label className="govuk-label govuk-label--s" htmlFor={`loa-return-${leave.id}`}>
          Returned on
        </label>
        <input
          className="govuk-input govuk-input--width-10"
          id={`loa-return-${leave.id}`}
          type="date"
          value={date}
          min={leave.starts_on}
          onChange={(event) => setDate(event.target.value)}
        />
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
          data-module="govuk-button"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save"}
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
