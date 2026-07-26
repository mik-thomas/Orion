import { useState } from "react";
import { updateLeaveOfAbsence } from "../api/leaves";
import { ApiError } from "../api/http";
import type { LeaveOfAbsence } from "../types/domain";

interface LoaExtendEditorProps {
  leave: LeaveOfAbsence;
  onUpdated: (leave: LeaveOfAbsence) => void;
  editable?: boolean;
}

function dayAfter(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function LoaExtendEditor({ leave, onUpdated, editable = true }: LoaExtendEditorProps) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(leave.ends_on ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canExtend = editable && !leave.returned_on;
  const minDate = leave.ends_on ? dayAfter(leave.ends_on) : leave.starts_on;

  if (!canExtend) {
    return <span>{leave.ends_on ?? "Open-ended"}</span>;
  }

  if (!editing) {
    return (
      <div className="orion-loa-review-editor">
        <span>{leave.ends_on ?? "Open-ended"}</span>
        {saved && (
          <p className="govuk-body-s govuk-!-margin-bottom-0 orion-loa-review-editor__saved" role="status">
            Saved
          </p>
        )}
        <button
          type="button"
          className="govuk-link orion-loa-review-editor__change"
          onClick={() => {
            setDate(minDate);
            setError(null);
            setSaved(false);
            setEditing(true);
          }}
        >
          Extend
        </button>
      </div>
    );
  }

  async function handleSave() {
    if (!date) {
      setError("Enter a new end date");
      return;
    }

    if (leave.ends_on && date <= leave.ends_on) {
      setError("New end date must be after the current end date");
      return;
    }

    if (!leave.ends_on && date < leave.starts_on) {
      setError("End date must be on or after the start date");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateLeaveOfAbsence(leave.magistrate_id, leave.id, {
        ends_on: date,
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
        <label className="govuk-label govuk-label--s" htmlFor={`loa-extend-${leave.id}`}>
          New end date
        </label>
        <input
          className="govuk-input govuk-input--width-10"
          id={`loa-extend-${leave.id}`}
          type="date"
          value={date}
          min={minDate}
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
