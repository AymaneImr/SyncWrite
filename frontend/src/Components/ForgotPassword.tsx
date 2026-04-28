import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

type ForgotPasswordProps = {
  mode?: "request" | "reset";
};

type StatusState = {
  type: "success" | "error" | "info" | "";
  msg: string;
};

const API_BASE_URL = "http://localhost:8080";

const statusClassName = (type: StatusState["type"]) => {
  if (type === "success") return "text-green-500";
  if (type === "error") return "text-red-500";
  return "text-gray-600";
};

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ mode = "request" }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [tokenStatus, setTokenStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetCompleted, setResetCompleted] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: "", msg: "" });

  const token = searchParams.get("token") ?? "";
  const isResetMode = mode === "reset";

  useEffect(() => {
    if (!isResetMode) return;

    if (!token) {
      setTokenStatus("invalid");
      setStatus({ type: "error", msg: "Reset link is missing a token." });
      return;
    }

    const verifyToken = async () => {
      setTokenStatus("loading");
      setStatus({ type: "info", msg: "Checking reset link..." });

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/auth/password-reset/verify?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();

        if (res.ok) {
          setTokenStatus("valid");
          setStatus({ type: "info", msg: data.info || "Reset link is valid." });
          return;
        }

        setTokenStatus("invalid");
        setStatus({ type: "error", msg: data.error || "Invalid or expired reset token" });
      } catch (error) {
        console.error("Failed to verify reset token:", error);
        setTokenStatus("invalid");
        setStatus({ type: "error", msg: "Unable to verify reset link right now." });
      }
    };

    void verifyToken();
  }, [isResetMode, token]);

  const resetState = () => {
    setEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
    setResetCompleted(false);
    setStatus({ type: "", msg: "" });
  };

  const handleRequestReset = async () => {
    if (!email) {
      setStatus({ type: "error", msg: "Please enter your email." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "info", msg: "Sending reset link..." });

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({
          type: "success",
          msg: data.info || "If the account exists, a reset link has been sent.",
        });
        return;
      }

      setStatus({ type: "error", msg: data.error || "Could not send reset link." });
    } catch (error) {
      console.error("Failed to request password reset:", error);
      setStatus({ type: "error", msg: "Unable to connect to the server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setStatus({ type: "error", msg: "Please fill both password fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }

    if (!token) {
      setStatus({ type: "error", msg: "Reset token is missing." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "info", msg: "Resetting password..." });

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setResetCompleted(true);
        setStatus({ type: "success", msg: data.info || "Password changed successfully" });
        return;
      }

      setStatus({ type: "error", msg: data.error || "Could not reset password." });
    } catch (error) {
      console.error("Failed to reset password:", error);
      setStatus({ type: "error", msg: "Unable to connect to the server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-purple-600">Reset Password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Verify your link and choose a new password.
            </p>
          </div>

          {tokenStatus === "loading" && (
            <p className={`text-sm text-center ${statusClassName(status.type)}`}>{status.msg}</p>
          )}

          {tokenStatus === "valid" && (
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {status.msg && (
                <p className={`text-sm text-center ${statusClassName(status.type)}`}>{status.msg}</p>
              )}
              {resetCompleted ? (
                <div className="flex flex-col items-center gap-4 py-2 text-center">
                  <CheckCircle2 size={56} className="text-green-500" />
                  <Button
                    type="button"
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                    onClick={() => navigate("/login")}
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleResetPassword}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              )}
            </div>
          )}

          {tokenStatus === "invalid" && (
            <div className="space-y-4 text-center">
              <p className={`text-sm ${statusClassName(status.type)}`}>{status.msg}</p>
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        <button className="text-sm text-blue-500 hover:underline">Forgot Password?</button>
      </DialogTrigger>

      <DialogContent className="max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-purple-600">
            Forgot Password
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {status.msg && (
            <p className={`text-sm text-center ${statusClassName(status.type)}`}>{status.msg}</p>
          )}

          <Button
            type="button"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            onClick={handleRequestReset}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>

          <p className="text-center text-sm text-gray-500">
            We&apos;ll send a password reset link to your email.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPassword;
