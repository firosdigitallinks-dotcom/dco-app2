import { withBasePath } from "../lib/base-path";

export function LogoLockup({
  inverse = false,
}: {
  inverse?: boolean;
}) {
  return (
    <span className={`logo-lockup${inverse ? " logo-lockup--inverse" : ""}`}>
      <img
        src={withBasePath(
          inverse
            ? "/brand/dco-logo-horizontal-white.png"
            : "/brand/dco-logo-horizontal.png",
        )}
        alt="Diamond Capital Oasis - Division of Hygiene Links - OMAN"
        width="230"
        height="58"
        className="logo-lockup__img"
      />
    </span>
  );
}


