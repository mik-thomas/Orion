import { useState } from "react";
import { updateLeaveOfAbsence } from "../api/leaves";
import { ApiError } from "../api/http";
import { NextLoaReviewTag } from "../lib/loaReview";
import type { LeaveOfAbsence } from "../types/domain";

interface LoaReviewDateEditorProps {
  leave: LeaveOfAbsence;
  onUpdated: (leave: LeaveOfAbsence) => void;
  editable?: boolean;
}

export function LoaReviewDateEditor({ leave, onUpdated, editable = true }: LoaReviewDateEditorProps) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(leave.next_loa_review_on ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!editable) {
    return leave.active ? <NextLoaReviewTag leave={leave} /> : <span>{leave.next_loa_review_on ?? "—"}</span>;
  }

  if (!editing) {
    return (
      <div className="orion-loa-review-editor">
        <NextLoaReviewTag leave={leave} />
        {saved && (
          <p className="govuk-body-s govuk-!-margin-bottom-0 orion-loa-review-editor__saved" role="status">
            Saved
          </p>
        )}
        <button
          type="button"
          className="govuk-link orion-loa-review-editor__change"
          onClick={() => {
            setDate(leave.next_loa_review_on ?? "");
            setError(null);
            setSaved(false);
            setEditing(true);
          }}
        >
          {leave.next_loa_review_on ? "Change" : "Set date"}
        </button>
      </div>
    );
  }

  async function handleSave() {
    if (!date) {
      setError("Enter a review date");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateLeaveOfAbsence(leave.magistrate_id, leave.id, {
        next_review_on: date,
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
        <label className="govuk-label govuk-label--s" htmlFor={`loa-review-${leave.id}`}>
          Next LOA review
        </label>
        <input
          className="govuk-input govuk-input--width-10"
          id={`loa-review-${leave.id}`}
          type="date"
          value={date}
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
