import React, { useState } from "react";
import styles from "../css/Login.module.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User, Github, Chrome } from "lucide-react";
import ForgotPassword from "./ForgotPassword";

const LoginForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

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

    const endpoint = isLogin ? "/login" : "/register";
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
      } else {
        setMessage(data.error || "Invalid credentials or form data.");
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage("Unable to connect to the server.");
    }
  };

  //TODO: implement OAuth properly later

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8080/auth/google";
  };

  const handleGithubLogin = () => {
    window.location.href = "http://localhost:8080/auth/github";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.icon}>✨</div>
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Login to continue</p>
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
              style={{
                textAlign: "center",
                color: message.includes("Success") ? "green" : "red",
                fontSize: "0.85rem",
              }}
            >
              {message}
            </p>
          )}

          <Button type="submit" className={styles.gradientButton}>
            {isLogin ? "Login" : "Sign Up"}
          </Button>

          <div className={styles.divider}>
            <span>Or continue with</span>
          </div>

          <div className={styles.oauth}>
            <button
              type="button"
              className={styles.oauthBtn}
              onClick={handleGoogleLogin}
            >
              <Chrome size={18} /> Google
            </button>
            <button
              type="button"
              className={styles.oauthBtn}
              onClick={handleGithubLogin}
            >
              <Github size={18} /> GitHub
            </button>
          </div>

          <p className={styles.footerText}>
            {isLogin ? (
              <>
                Don’t have an account?{" "}
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

      <p className={styles.terms}>
        By continuing, you agree to our <span>Terms</span> &{" "}
        <span>Privacy Policy</span>
      </p>
    </div>
  );
};

export default LoginForm;

