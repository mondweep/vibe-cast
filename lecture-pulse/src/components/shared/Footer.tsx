interface FooterProps {
  className?: string;
}

/**
 * Compact credit footer with link to the creator's LinkedIn profile.
 */
export default function Footer({ className = "" }: FooterProps) {
  return (
    <footer
      className={`shrink-0 px-4 py-3 text-center text-xs text-dark-500 ${className}`}
    >
      <span>Built by </span>
      <a
        href="https://www.linkedin.com/in/mondweepchakravorty"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-accent-blue hover:text-accent-blue/80 transition-colors"
      >
        Mondweep Chakravorty
      </a>
      <span className="mx-1.5">|</span>
      <a
        href="https://www.linkedin.com/in/mondweepchakravorty"
        target="_blank"
        rel="noopener noreferrer"
        className="text-dark-400 hover:text-accent-blue transition-colors"
      >
        Connect on LinkedIn
      </a>
    </footer>
  );
}
