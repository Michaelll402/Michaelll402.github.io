// D-support (motion.md): role/state switcher. Teaches persisted-authority rechecks.
// SSR initial state = Phase-2 static state (CUSTOMER, live token, no admin action).
import { useId, useState } from "react";

type Role = "CUSTOMER" | "AGENT" | "MANAGER" | "ADMIN";
const ROLES: Role[] = ["CUSTOMER", "AGENT", "MANAGER", "ADMIN"];

// permission model per docs/facts/support.md: customers see own tickets and public
// thread; agents work the queue + internal notes; managers oversee; admins manage
// users and read audit logs.
const ACTIONS: { label: string; allowed: Role[] }[] = [
  { label: "View own tickets", allowed: ["CUSTOMER", "AGENT", "MANAGER", "ADMIN"] },
  { label: "View the queue", allowed: ["AGENT", "MANAGER", "ADMIN"] },
  { label: "Write internal note", allowed: ["AGENT", "MANAGER", "ADMIN"] },
  { label: "Manage users", allowed: ["ADMIN"] },
  { label: "Read audit log", allowed: ["ADMIN"] },
];

type TokenState =
  | { kind: "live" }
  | { kind: "inactive" }
  | { kind: "demoted"; from: Role };

export default function SupportDemo() {
  const [role, setRole] = useState<Role>("CUSTOMER");
  const [token, setToken] = useState<TokenState>({ kind: "live" });
  const groupId = useId();

  const deactivate = () => setToken({ kind: "inactive" });
  const demote = () => {
    if (role === "CUSTOMER") return;
    setToken({ kind: "demoted", from: role });
  };
  const restore = () => setToken({ kind: "live" });

  const denied =
    token.kind === "inactive"
      ? { code: "401 · ACCOUNT INACTIVE", detail: "isActive is false on the stored user" }
      : token.kind === "demoted"
        ? { code: "401 · TOKEN VERSION MISMATCH", detail: "tokenVersion was incremented by the demotion" }
        : null;

  return (
    <figure className="demo-panel">
      <figcaption className="demo-head">
        <span className="demo-label">Demo · role and state switcher</span>
        <span className="demo-nojs-note">Static view · interactive with JavaScript</span>
        <button
          type="button"
          className="demo-reset demo-js-only"
          onClick={() => {
            setRole("CUSTOMER");
            setToken({ kind: "live" });
          }}
        >
          Reset
        </button>
      </figcaption>
      <div className="demo-body">
        <div className="demo-chips" role="radiogroup" aria-label="Signed-in role" id={groupId}>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              className="demo-chip"
              onClick={() => {
                setRole(r);
                setToken({ kind: "live" });
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <table className="perm-table">
          <caption className="visually-hidden">Actions the API permits for the selected role</caption>
          <tbody>
            {ACTIONS.map((a) => {
              const ok = denied === null && a.allowed.includes(role);
              return (
                <tr key={a.label} className="perm-row-swap">
                  <th scope="row">{a.label}</th>
                  <td className={ok ? "perm-allow" : "perm-deny"}>{ok ? "✓ allowed" : "✕ denied"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="demo-admin-row demo-js-only">
          <span className="demo-admin-label">Admin acts on this account</span>
          <button type="button" className="demo-chip" onClick={deactivate} disabled={token.kind === "inactive"}>
            Deactivate account
          </button>
          <button
            type="button"
            className="demo-chip"
            onClick={demote}
            disabled={role === "CUSTOMER" || token.kind !== "live"}
            title={role === "CUSTOMER" ? "CUSTOMER is the lowest role" : undefined}
          >
            Demote role
          </button>
          <button type="button" className="demo-chip" onClick={restore} disabled={token.kind === "live"}>
            Restore
          </button>
        </div>

        <p className="demo-status" role="status" aria-live="polite">
          {denied ? (
            <>
              <span className="no">OLD TOKEN'S NEXT REQUEST → {denied.code}</span>
              <span className="check-reason">{denied.detail}. The signature is still valid; the persisted check fails.</span>
            </>
          ) : (
            <span className="ok">TOKEN LIVE · PERSISTED CHECKS PASS</span>
          )}
        </p>

        <p className="demo-footnote">
          The API rechecks the stored user on every guarded request: existence, active state, token
          version, current role.
        </p>
      </div>
    </figure>
  );
}
