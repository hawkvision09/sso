import Footer from "./Footer";

interface PageLayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
  showFooter?: boolean;
}

export default function PageLayout({
  children,
  showBackground = true,
  showFooter = true,
}: PageLayoutProps) {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      {showBackground && (
        <div className="fixed inset-0 bg-[var(--theme-background)]">
          {/* <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" /> */}
          {/* <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" /> */}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        {showFooter ? <Footer /> : null}
      </div>
    </div>
  );
}
