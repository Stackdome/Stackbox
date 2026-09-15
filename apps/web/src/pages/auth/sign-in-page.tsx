import { useNavigate } from "react-router-dom";
import { useRedirectWhenSignedIn, useSignIn } from "@/api/use-session";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";
import { ROUTES } from "@/lib/routes";

export function SignInPage() {
  const navigate = useNavigate();
  const signIn = useSignIn();
  useRedirectWhenSignedIn(ROUTES.tasks);

  return (
    <AuthFrame title="Sign in">
      <SignInForm
        onSubmit={async (draft) => {
          await signIn(draft);
          navigate(ROUTES.tasks, { replace: true });
        }}
      />
    </AuthFrame>
  );
}
