import { Link } from "react-router-dom";

interface MagistrateLinkProps {
  id: number;
  name: string;
  className?: string;
}

export function MagistrateLink({ id, name, className = "govuk-link" }: MagistrateLinkProps) {
  return (
    <Link to={`/magistrates/${id}`} className={className}>
      {name}
    </Link>
  );
}
