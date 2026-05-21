"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeOff, Mail, Lock, User, Hand, ArrowLeft, Check, X } from "lucide-react";

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuthStore();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const passwordStrength = useMemo(() => {
    const passed = PASSWORD_REQUIREMENTS.filter(req => req.test(password)).length;
    return {
      score: passed,
      label: passed === 0 ? "" : passed <= 2 ? "Weak" : passed === 3 ? "Good" : "Strong",
      color: passed <= 2 ? "bg-destructive" : passed === 3 ? "bg-primary" : "bg-green-500",
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === 1) {
      if (!name || !email) {
        setError("Please fill in all fields");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address");
        return;
      }
      setStep(2);
      return;
    }
    
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 3) {
      setError("Please choose a stronger password");
      return;
    }

    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    try {
      await signup(email, password, name);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Decorative (hidden on mobile) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-bl from-secondary/20 via-primary/20 to-accent/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/30 via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center max-w-md"
          >
            {/* Character */}
            <motion.img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Firefly_Gemini_Flash_can_you_generate_a_small__friendly_character_with_a_bob_and_glasses_with_a_yellow_and_599506-removebg-preview-f0y6dNmoZlhIHXK0EnPeZ6fVdomNYD.png"
              alt="SignLingo Mascot"
              className="w-40 h-40 mx-auto mb-8 drop-shadow-2xl"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <h2 className="text-2xl font-bold text-foreground mb-4">
              Start Your Sign Language Journey
            </h2>
            <p className="text-muted-foreground mb-8">
              Join millions of learners mastering sign language through fun, 
              gamified lessons and AI-powered feedback.
            </p>

            {/* Benefits */}
            <div className="space-y-4 text-left">
              {[
                { icon: "🎮", text: "Gamified learning with XP & badges" },
                { icon: "🤖", text: "AI-powered hand gesture recognition" },
                { icon: "🏆", text: "Compete in weekly leagues" },
                { icon: "📱", text: "Learn anytime, anywhere" },
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 bg-card/60 backdrop-blur-sm rounded-lg p-3 border border-border/50"
                >
                  <span className="text-xl">{benefit.icon}</span>
                  <span className="text-foreground">{benefit.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating Particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-secondary/30"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 4) * 18}%`,
            }}
            animate={{
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + i * 0.4,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md"
        >
          {/* Back Button */}
          {step === 1 ? (
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to home
            </Link>
          ) : (
            <button 
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to previous step
            </button>
          )}

          {/* Logo & Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Hand className="w-6 h-6 text-secondary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">SignLingo</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {step === 1 ? "Create your account" : "Secure your account"}
            </h1>
            <p className="text-muted-foreground">
              {step === 1 
                ? "Start learning sign language for free" 
                : "Choose a strong password to protect your progress"
              }
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <>
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground font-medium">
                    Full name
                  </Label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                      focusedField === "name" ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your name"
                      className="pl-10 h-12 bg-card border-border focus:border-primary focus:ring-primary"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                      focusedField === "email" ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="you@example.com"
                      className="pl-10 h-12 bg-card border-border focus:border-primary focus:ring-primary"
                      autoComplete="email"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                      focusedField === "password" ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Create a password"
                      className="pl-10 pr-10 h-12 bg-card border-border focus:border-primary focus:ring-primary"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Strength */}
                  {password && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${passwordStrength.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          passwordStrength.score <= 2 ? "text-destructive" : 
                          passwordStrength.score === 3 ? "text-primary" : "text-green-500"
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {PASSWORD_REQUIREMENTS.map((req, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            {req.test(password) ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <X className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className={req.test(password) ? "text-green-500" : "text-muted-foreground"}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                      focusedField === "confirmPassword" ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10 h-12 bg-card border-border focus:border-primary focus:ring-primary"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                    className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="text-secondary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-secondary hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner className="w-5 h-5" />
                  Creating account...
                </span>
              ) : step === 1 ? (
                "Continue"
              ) : (
                "Create account"
              )}
            </Button>

            {step === 1 && (
              <>
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-background text-muted-foreground">
                      Or sign up with
                    </span>
                  </div>
                </div>

                {/* Social Signup */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-border hover:bg-card"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-border hover:bg-card"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    GitHub
                  </Button>
                </div>
              </>
            )}

            {/* Sign In Link */}
            <p className="text-center text-muted-foreground">
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
