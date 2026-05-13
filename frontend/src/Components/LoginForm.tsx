import React, { useEffect, useState } from "react";
import styles from "../css/Login.module.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User, Chrome, Sparkles, ShieldCheck, Wand2 } from "lucide-react";
import ForgotPassword from "./ForgotPassword";
import { useNavigate, useSearchParams } from "react-router-dom";

const LoginForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setMessage(error);
    }
  }, [searchParams]);

  const clearFields = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
  };

  const toggleForm = (login: boolean) => {
    setIsLogin(login);
    clearFields();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    if (!email || !password || (!isLogin && (!username || !confirmPassword))) {
      setMessage("Please fill all required fields.");
      return;
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin
      ? { email, password }
      : { username, email, password, confirmPassword };

    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Success!");
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("access_token", data.access_token);
        console.log(data.access_token);

        navigate("/");

      } else {
        setMessage(data.error || "Invalid credentials or form data.");
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage("Unable to connect to the server.");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8080/api/auth/google/login";
  };

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <section className={styles.introPanel}>
          <div className={styles.introBadge}>
            <Sparkles size={16} /> Modern collaborative writing
          </div>
          <h1 className={styles.introTitle}>
            Focus on the draft.
            <span> Let SyncWrite handle the flow.</span>
          </h1>
          <p className={styles.introText}>
            Create, review, and refine documents with a workspace built for live
            collaboration, clean organization, and less friction.
          </p>
          <div className={styles.introPoints}>
            <div className={styles.introPoint}>
              <ShieldCheck size={18} />
              Secure sharing and access control
            </div>
            <div className={styles.introPoint}>
              <Wand2 size={18} />
              Fast onboarding for new drafts
            </div>
          </div>
        </section>

        <div className={styles.authPanel}>
          <div className={styles.header}>
            <div className={styles.icon}>✨</div>
            <h2 className={styles.title}>{isLogin ? "Welcome Back" : "Create Your Account"}</h2>
            <p className={styles.subtitle}>
              {isLogin ? "Log in to continue your work" : "Start collaborating in minutes"}
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${isLogin ? styles.active : ""}`}
                onClick={() => toggleForm(true)}
              >
                Login
              </button>
              <button
                type="button"
                className={`${styles.tab} ${!isLogin ? styles.active : ""}`}
                onClick={() => toggleForm(false)}
              >
                Register
              </button>
            </div>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {!isLogin && (
                <div className={styles.inputGroup}>
                  <User size={18} className={styles.iconInput} />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <Mail size={18} className={styles.iconInput} />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <Lock size={18} className={styles.iconInput} />
                <Input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {!isLogin && (
                <div className={styles.inputGroup}>
                  <Lock size={18} className={styles.iconInput} />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              {isLogin && (
                <div className={styles.forgot}>
                  <ForgotPassword />
                </div>
              )}

              {message && (
                <p
                  className={`${styles.message} ${message.includes("Success") ? styles.success : styles.error
                    }`}
                >
                  {message}
                </p>
              )}

              <Button type="submit" className={styles.gradientButton}>
                {isLogin ? "Login" : "Sign Up"}
              </Button>

              <div className={styles.divider}>
                <span>Or continue with Google</span>
              </div>

              <div className={styles.oauth}>
                <button
                  type="button"
                  className={styles.oauthBtn}
                  onClick={handleGoogleLogin}
                >
                  <Chrome size={18} /> Continue with Google
                </button>
              </div>

              <p className={styles.footerText}>
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <span onClick={() => toggleForm(false)}>Register here</span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <span onClick={() => toggleForm(true)}>Login here</span>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>

      <p className={styles.terms}>
        By continuing, you agree to our <span>Terms</span> &{" "}
        <span>Privacy Policy</span>
      </p>
    </div>
  );
};

export default LoginForm;
