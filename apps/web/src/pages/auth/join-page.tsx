import { InviteStatus } from "@stackbox/contract";
import { Link, useNavigate, useParams } from "react-router-dom";
import { joinErrorMessage } from "@/api/errors";
import { INVITE_UNAVAILABLE_TEXT } from "@/api/mappers/organization";
import { useInvitePreview, useJoin } from "@/api/use-session";
import { AuthFrame } from "@/components/auth/auth-frame";
import { JoinForm } from "@/components/auth/join-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";

function GoToSignIn() {
  return (
    <Button asChild variant="outline">
      <Link to={ROUTES.login}>Go to Sign in</Link>
    </Button>
  );
}

export function JoinPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { preview, loading, error } = useInvitePreview(token);
  const join = useJoin(token);

  if (loading) {
    return (
      <AuthFrame title="Join">
        <Skeleton className="h-40" />
      </AuthFrame>
    );
  }
  if (!preview) {
    return (
      <AuthFrame title="Join">
        <p className="text-body text-fg-2">{joinErrorMessage(error)}</p>
        <GoToSignIn />
      </AuthFrame>
    );
  }
  const title = `Join ${preview.organizationName}`;
  if (preview.status !== InviteStatus.Pending) {
    return (
      <AuthFrame title={title}>
        <p className="text-body text-fg-2">{INVITE_UNAVAILABLE_TEXT[preview.status]}</p>
        <GoToSignIn />
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title={title}>
      <JoinForm
        preview={preview}
        onSubmit={async (draft) => {
          await join(draft);
          navigate(ROUTES.tasks, { replace: true });
        }}
      />
    </AuthFrame>
  );
}
