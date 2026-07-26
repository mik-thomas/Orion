import { useState } from "react";
import { updateMagistrate } from "../api/magistrates";
import { ApiError } from "../api/http";

interface ContactNumberEditorProps {
  magistrateId: number;
  contactNumber: string | null;
  onUpdated: (contactNumber: string | null) => void;
  editable?: boolean;
}

export function ContactNumberEditor({
  magistrateId,
  contactNumber,
  onUpdated,
  editable = true,
}: ContactNumberEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(contactNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!editable) {
    return <span>{contactNumber?.trim() ? contactNumber : "Not recorded"}</span>;
  }

  if (!editing) {
    return (
      <div className="orion-loa-review-editor">
        <span>{contactNumber?.trim() ? contactNumber : "Not recorded"}</span>
        {saved && (
          <p className="govuk-body-s govuk-!-margin-bottom-0 orion-loa-review-editor__saved" role="status">
            Saved
          </p>
        )}
        <button
          type="button"
          className="govuk-link orion-loa-review-editor__change"
          onClick={() => {
            setValue(contactNumber ?? "");
            setError(null);
            setSaved(false);
            setEditing(true);
          }}
        >
          {contactNumber?.trim() ? "Change" : "Add number"}
        </button>
      </div>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const trimmed = value.trim();
      const updated = await updateMagistrate(magistrateId, {
        contact_number: trimmed.length > 0 ? trimmed : null,
      });
      onUpdated(updated.contact_number);
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
        <label className="govuk-label govuk-label--s" htmlFor={`contact-number-${magistrateId}`}>
          Contact number
        </label>
        <input
          className="govuk-input"
          id={`contact-number-${magistrateId}`}
          type="tel"
          autoComplete="tel"
          value={value}
          onChange={(event) => setValue(event.target.value)}
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
