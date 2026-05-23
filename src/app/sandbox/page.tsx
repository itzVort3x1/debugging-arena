import { getAllChallenges } from "@/lib/challenges/registry";
import { SandboxClient } from "./SandboxClient";

export default function SandboxPage() {
  const challenges = getAllChallenges();
  const challenge = challenges[0];

  if (!challenge) {
    return (
      <div className="flex h-screen items-center justify-center bg-vscode-bg text-sm text-vscode-fg">
        No challenges found in /challenges.
      </div>
    );
  }

  return <SandboxClient challenge={challenge} />;
}
