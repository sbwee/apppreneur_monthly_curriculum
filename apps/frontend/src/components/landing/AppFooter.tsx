const footerLinks = ["Privacy Policy", "Terms of Service", "Help Center"];

export function AppFooter() {
  return (
    <footer className="landing-footer">
      <p>© 2026 Curio. Cultivate your curiosity.</p>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap items-center gap-6">
          {footerLinks.map((item) => (
            <li key={item}>
              <a href="#" className="transition hover:text-[var(--color-brand-forest)]">
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
