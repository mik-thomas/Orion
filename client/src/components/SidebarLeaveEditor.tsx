import { useState } from "react";
import { destroyLeaveOfAbsence, updateLeaveOfAbsence } from "../api/leaves";
import { ApiError } from "../api/http";
import type { LeaveOfAbsence } from "../types/domain";
import { NextLoaReviewTag } from "../lib/loaReview";

export function SidebarLeaveEditor({
  magistrateId,
  leave,
  editable = true,
  onChanged,
}: {
  magistrateId: number;
  leave: LeaveOfAbsence;
  editable?: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [startsOn, setStartsOn] = useState(leave.starts_on);
  const [endsOn, setEndsOn] = useState(leave.ends_on ?? "");
  const [reason, setReason] = useState(leave.reason ?? "");
  const [notes, setNotes] = useState(leave.notes ?? "");
  const [reviewOn, setReviewOn] = useState(leave.next_loa_review_on ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editable) {
    return (
      <li>
        {leave.starts_on} to {leave.ends_on ?? "open-ended"}
        {leave.reason ? ` — ${leave.reason}` : ""}
        <br />
        Next review: <NextLoaReviewTag leave={leave} />
      </li>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateLeaveOfAbsence(magistrateId, leave.id, {
        starts_on: startsOn,
        ends_on: endsOn.trim() ? endsOn : null,
        reason: reason.trim() ? reason.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
        next_review_on: reviewOn.trim() ? reviewOn : null,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this leave of absence record?")) return;
    setSaving(true);
    setError(null);
    try {
      await destroyLeaveOfAbsence(magistrateId, leave.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <li>
        {leave.starts_on} to {leave.ends_on ?? "open-ended"}
        {leave.reason ? ` — ${leave.reason}` : ""}
        <br />
        Next review: <NextLoaReviewTag leave={leave} />
        <div className="orion-loa-review-editor__actions govuk-!-margin-top-1">
          <button
            type="button"
            className="govuk-link orion-loa-review-editor__change"
            onClick={() => {
              setStartsOn(leave.starts_on);
              setEndsOn(leave.ends_on ?? "");
              setReason(leave.reason ?? "");
              setNotes(leave.notes ?? "");
              setReviewOn(leave.next_loa_review_on ?? "");
              setError(null);
              setEditing(true);
            }}
          >
            Change
          </button>
          <button
            type="button"
            className="govuk-link orion-loa-review-editor__change"
            disabled={saving}
            onClick={() => void handleDelete()}
          >
            Delete
          </button>
        </div>
        {error && (
          <p className="govuk-error-message govuk-!-margin-bottom-0">
            <span className="govuk-visually-hidden">Error:</span>
            {error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li>
      <div className="orion-loa-review-editor orion-loa-review-editor--editing">
        <div className="govuk-form-group govuk-!-margin-bottom-2">
          <label className="govuk-label govuk-label--s" htmlFor={`loa-start-${leave.id}`}>
            Starts on
          </label>
          <input
            className="govuk-input"
            id={`loa-start-${leave.id}`}
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
        </div>
        <div className="govuk-form-group govuk-!-margin-bottom-2">
          <label className="govuk-label govuk-label--s" htmlFor={`loa-end-${leave.id}`}>
            Ends on
          </label>
          <input
            className="govuk-input"
            id={`loa-end-${leave.id}`}
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </div>
        <div className="govuk-form-group govuk-!-margin-bottom-2">
          <label className="govuk-label govuk-label--s" htmlFor={`loa-reason-${leave.id}`}>
            Reason
          </label>
          <input
            className="govuk-input"
            id={`loa-reason-${leave.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="govuk-form-group govuk-!-margin-bottom-2">
          <label className="govuk-label govuk-label--s" htmlFor={`loa-notes-${leave.id}`}>
            Notes
          </label>
          <textarea
            className="govuk-textarea"
            id={`loa-notes-${leave.id}`}
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="govuk-form-group govuk-!-margin-bottom-2">
          <label className="govuk-label govuk-label--s" htmlFor={`loa-review-${leave.id}`}>
            Next review
          </label>
          <input
            className="govuk-input"
            id={`loa-review-${leave.id}`}
            type="date"
            value={reviewOn}
            onChange={(event) => setReviewOn(event.target.value)}
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
            disabled={saving || !startsOn}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="govuk-button govuk-button--warning govuk-!-margin-bottom-0"
            disabled={saving}
            onClick={() => void handleDelete()}
          >
            Delete
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
    </li>
  );
}
