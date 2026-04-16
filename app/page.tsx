"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, ToastContainer } from "@/components/ui/toast";
import { login as apiLogin } from "@/lib/api";
import { Building2, Lock, User, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("hr_user");
    if (storedUser) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiLogin(username, password);

      if (response.status === "success" && response.user) {
        localStorage.setItem("hr_user", JSON.stringify(response.user));
        toast("Welcome back! Redirecting to dashboard...", "success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        throw new Error(response.msg || "Invalid credentials");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setShake(true);
      toast(message, "error");
      setTimeout(() => setShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (password.length === 0) return { level: 0, label: "", color: "" };
    if (password.length < 4) return { level: 1, label: "Weak", color: "bg-destructive" };
    if (password.length < 8) return { level: 2, label: "Fair", color: "bg-warning" };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 4, label: "Strong", color: "bg-success" };
    }
    return { level: 3, label: "Good", color: "bg-primary" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-card via-background to-card overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold text-foreground">HR Portal</span>
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight text-balance">
              Enterprise Workforce Management Platform
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Streamline your HR operations with our integrated dashboard for payroll, attendance, and employee management.
            </p>

            {/* Feature highlights */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Real-time Analytics</h3>
                  <p className="text-sm text-muted-foreground">Live insights into your workforce performance</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Secure & Compliant</h3>
                  <p className="text-sm text-muted-foreground">Enterprise-grade security for your data</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Integrated Systems</h3>
                  <p className="text-sm text-muted-foreground">SQL Server + MySQL unified dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">HR Portal</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={shake ? "animate-[shake_0.5s_ease-in-out]" : ""}>
              <Input
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<User className="h-4 w-4" />}
                error={error && !username ? "Username is required" : undefined}
                required
              />
            </div>

            <div className={shake ? "animate-[shake_0.5s_ease-in-out]" : ""}>
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                error={error && !password ? "Password is required" : undefined}
                required
              />

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 animate-fade-in">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 h-full transition-all duration-300 ${
                            level <= strength.level ? strength.color : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${strength.color.replace("bg-", "text-")}`}>
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              isLoading={isLoading}
            >
              {!isLoading && (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Demo credentials: <span className="text-foreground font-medium">admin / admin123</span>
          </p>
        </div>
      </div>

      <ToastContainer />

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
