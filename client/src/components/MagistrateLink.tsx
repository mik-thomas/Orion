import { Link } from "react-router-dom";
import { defaultProfilePeriodFilter, magistrateProfilePath } from "../lib/periodFilter";

interface MagistrateLinkProps {
  id: number;
  name: string;
  className?: string;
}

export function MagistrateLink({ id, name, className = "govuk-link" }: MagistrateLinkProps) {
  return (
    <Link to={magistrateProfilePath(id, defaultProfilePeriodFilter())} className={className}>
      {name}
    </Link>
  );
}
