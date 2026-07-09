import { ROLES, type Role } from "../lib/role";
import { useRole } from "../context/RoleContext";

export function RoleSelector() {
  const { role, setRole } = useRole();

  return (
    <div className="orion-role-selector">
      <label className="govuk-visually-hidden" htmlFor="orion-role">
        Your role
      </label>
      <div className="orion-role-selector__control">
        <select
          className="orion-role-selector__select"
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
        <span className="orion-role-selector__chevron" aria-hidden="true" />
      </div>
      <span id="orion-role-hint" className="govuk-visually-hidden">
        Controls whether magistrate names or reference codes are shown
      </span>
    </div>
  );
}
