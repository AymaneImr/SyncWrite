import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ForgotPassword: React.FC = () => {
  const [stage, setStage] = useState<number>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; msg: string }>({
    type: "",
    msg: "",
  });
  const [emailSent, setEmailSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const gradientLine = "h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600";

  const handleSendCode = async () => {
    if (!email) {
      setStatus({ type: "error", msg: "Please enter your email." });
      return;
    }
    setEmailSent(true);
    setStatus({ type: "success", msg: `We've sent a 6-digit verification code to ${email}` });
  };

  const handleVerifyCode = async () => {
    if (code.length < 6) {
      setStatus({ type: "error", msg: "Code must be 6 digits." });
      return;
    }
    if (code === "123456") {
      setCodeVerified(true);
      setStatus({ type: "success", msg: "Verification code accepted!" });
    } else {
      setStatus({ type: "error", msg: "Invalid verification code." });
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }
    setStatus({ type: "success", msg: "Password successfully reset!" });
  };

  const handleContinue = () => {
    if (stage === 1 && emailSent) setStage(2);
    if (stage === 2 && codeVerified) setStage(3);
    if (stage === 3 && status.type === "success") setStage(4);
  };

  const handleBackToLogin = () => {
    setStage(1);
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus({ type: "", msg: "" });
    setEmailSent(false);
    setCodeVerified(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm text-blue-500 hover:underline">Forgot Password?</button>
      </DialogTrigger>

      <DialogContent className="max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-purple-600">
            Reset Password
          </DialogTitle>

          <div className="flex justify-between items-center mt-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-1/5 h-1 ${step <= stage ? gradientLine : "bg-gray-200 rounded-full"
                  }`}
              />
            ))}
          </div>
        </DialogHeader>

        <form className="mt-6 space-y-4">
          <AnimatePresence mode="wait">
            {stage === 1 && (
              <motion.div
                key="stage1"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-3"
              >
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {status.msg && (
                  <p
                    className={`text-sm ${status.type === "success" ? "text-green-500" : "text-red-500"
                      }`}
                  >
                    {status.msg}
                  </p>
                )}
                {!emailSent ? (
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                    onClick={handleSendCode}
                  >
                    Send
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                    onClick={handleContinue}
                  >
                    Continue
                  </Button>
                )}
              </motion.div>
            )}

            {stage === 2 && (
              <motion.div
                key="stage2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-3"
              >
                <Input
                  type="text"
                  placeholder="Enter verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                {status.msg && (
                  <p
                    className={`text-sm ${status.type === "success" ? "text-green-500" : "text-red-500"
                      }`}
                  >
                    {status.msg}
                  </p>
                )}
                {!codeVerified && (
                  <Button
                    type="button"
                    onClick={handleVerifyCode}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  >
                    Verify
                  </Button>
                )}
                {codeVerified && (
                  <Button
                    type="button"
                    onClick={handleContinue}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  >
                    Continue
                  </Button>
                )}
              </motion.div>
            )}

            {stage === 3 && (
              <motion.div
                key="stage3"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-3"
              >
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
                  <p
                    className={`text-sm ${status.type === "success" ? "text-green-500" : "text-red-500"
                      }`}
                  >
                    {status.msg}
                  </p>
                )}
                <Button
                  type="button"
                  onClick={handleResetPassword}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                >
                  Reset
                </Button>
                {status.type === "success" && (
                  <Button
                    type="button"
                    onClick={handleContinue}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  >
                    Continue
                  </Button>
                )}
              </motion.div>
            )}

            {stage === 4 && (
              <motion.div
                key="stage4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4 py-6 text-center"
              >
                <CheckCircle2 size={64} className="text-green-500" />
                <p className="text-lg font-semibold">Password Reset Complete!</p>
                <p className="text-gray-600 text-sm">
                  Your password has been successfully reset. You can now login with your new
                  password.
                </p>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={handleBackToLogin}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                  >
                    Back to Login
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPassword;

