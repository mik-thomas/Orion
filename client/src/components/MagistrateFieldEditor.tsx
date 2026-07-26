import { useState, type ReactNode } from "react";
import { updateMagistrate, type MagistrateUpdateAttrs } from "../api/magistrates";
import { ApiError } from "../api/http";
import type { MagistrateDetail } from "../types/domain";

export type MagistrateFieldKind = "text" | "textarea" | "date" | "number" | "select" | "boolean";

type SelectOption = { value: string; label: string };

interface MagistrateFieldEditorProps {
  magistrateId: number;
  label: string;
  field: keyof MagistrateUpdateAttrs;
  value: string | number | boolean | null | undefined;
  kind?: MagistrateFieldKind;
  options?: SelectOption[];
  clearable?: boolean;
  editable?: boolean;
  emptyLabel?: string;
  display?: ReactNode;
  /** Extra attrs sent with save (e.g. clear related fields). */
  withAttrs?: (next: string | number | boolean | null) => MagistrateUpdateAttrs;
  onUpdated: (magistrate: MagistrateDetail) => void;
}

function formatDisplay(
  value: string | number | boolean | null | undefined,
  kind: MagistrateFieldKind,
  options: SelectOption[] | undefined,
  emptyLabel: string
): string {
  if (value == null || value === "") return emptyLabel;
  if (kind === "boolean") return value ? "Yes" : "No";
  if (kind === "select" && options) {
    const match = options.find((option) => option.value === String(value));
    return match?.label ?? String(value);
  }
  return String(value);
}

function toInputValue(
  value: string | number | boolean | null | undefined,
  kind: MagistrateFieldKind
): string {
  if (value == null) return kind === "boolean" ? "false" : "";
  if (kind === "boolean") return value ? "true" : "false";
  return String(value);
}

function parseInputValue(
  raw: string,
  kind: MagistrateFieldKind
): string | number | boolean | null {
  const trimmed = raw.trim();
  if (kind === "boolean") return raw === "true";
  if (trimmed === "") return null;
  if (kind === "number") {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return trimmed;
}

export function MagistrateFieldEditor({
  magistrateId,
  label,
  field,
  value,
  kind = "text",
  options,
  clearable = true,
  editable = true,
  emptyLabel = "Not recorded",
  display,
  withAttrs,
  onUpdated,
}: MagistrateFieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toInputValue(value, kind));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const shown =
    display ?? formatDisplay(value, kind, options, emptyLabel);
  const hasValue =
    value != null && value !== "" && !(typeof value === "string" && !value.trim());

  if (!editable) {
    return <span>{shown}</span>;
  }

  async function persist(next: string | number | boolean | null) {
    setSaving(true);
    setError(null);
    try {
      const attrs: MagistrateUpdateAttrs = {
        [field]: next,
        ...(withAttrs?.(next) ?? {}),
      };
      const updated = await updateMagistrate(magistrateId, attrs);
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
        <span>{shown}</span>
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
              setDraft(toInputValue(value, kind));
              setError(null);
              setSaved(false);
              setEditing(true);
            }}
          >
            {hasValue ? "Change" : "Add"}
          </button>
          {clearable && hasValue ? (
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

  const inputId = `magistrate-field-${String(field)}-${magistrateId}`;

  return (
    <div className="orion-loa-review-editor orion-loa-review-editor--editing">
      <div className="govuk-form-group govuk-!-margin-bottom-2">
        <label className="govuk-label govuk-label--s" htmlFor={inputId}>
          {label}
        </label>
        {kind === "textarea" ? (
          <textarea
            className="govuk-textarea"
            id={inputId}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        ) : kind === "boolean" && !options ? (
          <div className="govuk-checkboxes govuk-checkboxes--small">
            <div className="govuk-checkboxes__item">
              <input
                className="govuk-checkboxes__input"
                id={inputId}
                type="checkbox"
                checked={draft === "true"}
                onChange={(event) => setDraft(event.target.checked ? "true" : "false")}
              />
              <label className="govuk-label govuk-checkboxes__label" htmlFor={inputId}>
                {label}
              </label>
            </div>
          </div>
        ) : kind === "select" || kind === "boolean" ? (
          <select
            className="govuk-select"
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          >
            {(options ?? [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ]).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="govuk-input"
            id={inputId}
            type={kind === "date" ? "date" : kind === "number" ? "number" : "text"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        )}
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
          onClick={() => void persist(parseInputValue(draft, kind))}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {clearable ? (
          <button
            type="button"
            className="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
            disabled={saving}
            onClick={() => void persist(null)}
          >
            Clear
          </button>
        ) : null}
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
