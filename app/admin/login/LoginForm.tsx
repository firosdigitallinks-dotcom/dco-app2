"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(result.error || "Unable to sign in.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form className="cms-login-card" onSubmit={submit}>
      <img src="/brand/dco-mark.png" alt="Diamond Capital Oasis" width="72" height="72" />
      <p>Diamond Capital Oasis CMS</p>
      <h1>Content manager</h1>
      <label>
        <span>Administrator email</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <div className="cms-login-error">{error}</div>}
      <button className="button button--primary" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <a href="/">← Return to website</a>
    </form>
  );
}
