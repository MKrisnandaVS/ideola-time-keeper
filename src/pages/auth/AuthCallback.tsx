import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { handleAuthCallback, completeProfileSetup } from "@/services/google-auth.service";
import { saveSession } from "@/services/auth.service";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const result = await handleAuthCallback();

      if (result.isNewUser) {
        // New user - need to complete profile
        setUserData(result.user);
        setIsLoading(false);
      } else {
        // Existing user - save session and redirect
        const session = {
          user: result.user,
          token: `${result.user.id}-${Date.now()}`,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };
        saveSession(session);

        toast.success(`Welcome back, ${result.user.full_name}!`);

        // Redirect based on role
        if (result.user.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/tracker");
        }
      }
    } catch (error: any) {
      console.error("Auth callback error:", error);
      toast.error(error.message || "Authentication failed");
      // Redirect back to login after delay
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    setIsCompleting(true);

    try {
      const updatedUser = await completeProfileSetup(fullName.trim());

      // Save session with updated user data
      const session = {
        user: updatedUser,
        token: `${updatedUser.id}-${Date.now()}`,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };
      saveSession(session);

      toast.success(`Welcome, ${updatedUser.full_name}!`);

      // Redirect based on role
      if (updatedUser.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/tracker");
      }
    } catch (error: any) {
      console.error("Profile setup error:", error);
      toast.error(error.message || "Failed to complete profile");
    } finally {
      setIsCompleting(false);
    }
  };

  // Loading state - handling OAuth callback
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Signing you in...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile setup for new users
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="container mx-auto px-4 sm:px-12 lg:px-16 w-full">
        <div className="flex justify-center">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold text-primary tracking-wider">
                Complete Your Profile
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                Welcome! Please enter your name to continue
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompleteProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs text-muted-foreground uppercase tracking-wider">
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-input border-border text-foreground"
                    disabled={isCompletingProfile}
                    autoComplete="name"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be displayed throughout the app
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase font-bold py-6"
                  disabled={isCompletingProfile}
                >
                  {isCompletingProfile ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
