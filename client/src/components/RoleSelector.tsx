import { ROLES, type Role } from "../lib/role";
import { useRole } from "../context/RoleContext";

export function RoleSelector() {
  const { role, setRole } = useRole();

  return (
    <div className="orion-role-selector govuk-form-group govuk-!-margin-bottom-0">
      <label className="govuk-label govuk-visually-hidden" htmlFor="orion-role">
        Your role
      </label>
      <select
        className="govuk-select orion-role-selector__select"
        id="orion-role"
        name="orion-role"
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
        aria-describedby="orion-role-hint"
      >
        {ROLES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span id="orion-role-hint" className="govuk-visually-hidden">
        Controls whether magistrate names or reference codes are shown
      </span>
    </div>
  );
}
