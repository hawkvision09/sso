interface PageLayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
}

export default function PageLayout({
  children,
  showBackground = true,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen relative">
      {/* Background */}
      {showBackground && (
        <div className="fixed inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
