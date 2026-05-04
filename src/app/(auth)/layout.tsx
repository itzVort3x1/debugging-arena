export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-vscode-bg p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-vscode-fg mb-6 text-center">
          Debugging Arena
        </h1>
        <div className="bg-vscode-bg-elevated border border-vscode-border rounded-md p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
