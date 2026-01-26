import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signInWithGoogle } from "@/services/google-auth.service";
import { Loader2 } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // The redirect will happen automatically
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      if (error.message !== "Redirecting to Google...") {
        toast.error(error.message || "Failed to sign in with Google");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 sm:px-12 lg:px-16 w-full">
        <div className="flex justify-center">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold text-primary tracking-wider">
                IDEOLA
              </CardTitle>
              <p className="text-muted-foreground text-sm uppercase tracking-widest mt-2">
                Time Tracker System
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Sign in with your Google account to continue
                </p>
              </div>

              {/* Google Sign-In Button */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-medium py-6 flex items-center justify-center gap-3 transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25-.56-1.16.41-2.09-.99-2.84-1.73-.41-.37-.75-.94-1.02-1.56l1.81-1.48c.43.52 1.08 1.08 1.74 1.81 1.74.74 0 1.47-.15 2.11-.47.65-.32 1.17-.75 1.56-1.27.36-.51.76-.72-1.47-.72-2.34 0-.16.03-.32.05-.48-.07-.46-.13-.9-.25-1.31-.37-.62-.26-1.25-.57-1.89-.94-.26-.15-.53-.28-.8-.4-.73-.37-1.42-.56-2.06-.43-.63-.65-1.24-.65-1.84 0-1.27.38-2.43 1.02-3.22.75-.82 1.48-1.24 3.42-1.24 5.62v.12c0 .64-.32 1.25-.78 1.81-1.12.55-.36 1.13-.68 1.73-.98.74-.46 1.49-.69 2.26-.69.77 0 1.52.15 2.21.47.72.36.45.87.73 1.18.94.47.25.9.54 1.35.73 2.21.9.39.18.8.21 1.55.05 2.28.21.35.39.56.15.92.29 1.79.45 2.67.15.52.22.6.43.91.47 1.39.47 2.12v.75c0 2.47-.15 4.8-.44 6.98-.59 1.18-.13 2.31-.34 3.37-.63.27-.13.54-.28.8-.45-.73-.27-.19-.53-.4-.81-.56-.65-.26-1.28-.57-1.89-.94-.26-.15-.53-.28-.8-.4-.72-.37-1.42-.56-2.06-.43-.63-.65-1.24-.65-1.84z"
                        fill="#4285F4"
                      />
                      <path
                        d="M5.41 20.17c-.64-.36-1.25-.78-1.81-1.12-.55-.36-1.13-.68-1.73-.98-.74-.46-1.49-.69-2.26-.69-.77 0-1.52.15-2.21.47-.72.36-1.17.75-1.56 1.27-.36.51-.76.72-1.47.72-2.34 0-.16.03-.32.05-.48-.07-.46-.13-.9-.25-1.31-.37-.62-.26-1.25-.57-1.89-.94-.26-.15-.53-.28-.8-.4-.72-.37-1.42-.56-2.06-.43-.63-.65-1.24-.65-1.84 0-1.27.38-2.43 1.02-3.22.75-.82 1.48-1.24 3.42-1.24 5.62v.12c0 .64-.32 1.25-.78 1.81-1.12.55-.36 1.13-.68 1.73-.98.74-.46 1.49-.69 2.26-.69.77 0 1.52.15 2.21.47.72.36.45.87.73 1.18.94.47.25.9.54 1.35.73 2.21.9.39.18.8.21 1.55.05 2.28.21.35.39.56.15.92.29 1.79.45 2.67.15.52.22.6.43.91.47 1.39.47 2.12v.75c0 2.47-.15 4.8-.44 6.98-.59 1.18-.13 2.31-.34 3.37-.63.27-.13.54-.28.8-.45-.73-.27-.19-.53-.4-.81-.56-.65-.26-1.28-.57-1.89-.94-.26-.15-.53-.28-.8-.4-.72-.37-1.42-.56-2.06-.43-.63-.65-1.24-.65-1.84z"
                        fill="#34A853"
                      />
                      <path
                        d="M12.11 23.35c-1.53 0-3.04-.15-4.5-.43-.75-.17-1.48-.39-2.18-.67-.4-.18-.79-.39-1.18-.67-.37-.26-.73-.55-1.07-.85-.32-.28-.64-.6-.93-.95-.41-.4-.78-.87-1.11-1.37-.45-.6-.8-1.27-.99-2.06-.17-.52-.23-1.07-.23-1.64v-6.6c0-2.47.15-4.8.44-6.98.59-1.18.13-2.31.34-3.37.63-.27.13-.54.28-.8.45-.73.27-.19.53-.4.81-.56.65.26 1.28.57 1.89.94.26.15.53.28.8.4.72.37 1.42.56 2.06.43.63.65 1.24.65 1.84 0 1.27-.38 2.43-1.02 3.22-.75.82-1.24 3.42-1.24 5.62v-.12c0-.64.32-1.25.78-1.81 1.12-.55.36-1.13.68-1.73.98-.74.46-1.49.69-2.26.69-.77 0-1.52-.15-2.21-.47-.72-.36-1.17-.75-1.56-1.27-.36-.51-.76-.72-1.47-.72-2.34 0-.16.03-.32.05-.48.07-.46.13-.9.25-1.31.37-.62.26-1.25.57-1.89.94-.26.15-.53.28-.8.4-.72-.37-1.42-.56-2.06-.43-.63-.65-1.24-.65-1.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12.11 5.9c-1.53 0-3.04.15-4.5.43-.75.17-1.48.39-2.18.67-.4.18-.79.39-1.18.67-.37.26-.73.55-1.07.85-.32.28-.64.6-.93.95-.41.4-.78.87-1.11 1.37-.45.6-.8 1.27-.99 2.06-.17.52-.23 1.07-.23 1.64v6.6c0 2.47-.15 4.8-.44 6.98-.59 1.18-.13 2.31-.34 3.37-.63.27.13.54-.28.8-.45.73-.27.19-.53.4-.81.56-.65-.26-1.28-.57-1.89-.94-.26-.15-.53-.28-.8-.4-.72-.37-1.42-.56-2.06-.43-.63-.65-1.24-.65-1.84 0-1.27.38-2.43 1.02-3.22.75.82 1.24 3.42 1.24 5.62v.12c0 .64.32 1.25.78 1.81-1.12.55-.36 1.13-.68 1.73-.98.74-.46-1.49-.69-2.26-.69-.77 0-1.52.15-2.21.47-.72-.36-1.17-.75-1.56-1.27-.36-.51-.76-.72-1.47-.72-2.34 0-.16.03-.32.05-.48.07-.46.13-.9.25-1.31.37-.62.26-1.25.57-1.89.94-.26.15-.53.28-.8.4-.72-.37-1.42-.56-2.06-.43-.63-.65-1.24-.65-1.84z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>

              <div className="text-center mt-4">
                <p className="text-xs text-muted-foreground">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
