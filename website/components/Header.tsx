export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-bmg-navy text-white shadow-lg">
      <div className="container flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-serif font-bold">BMG</div>
          <div className="text-sm">
            <div className="font-bold">Summer School</div>
            <div className="text-xs text-bmg-cream">Assam 2026</div>
          </div>
        </div>
        <nav className="hidden md:flex gap-6 text-sm">
          <a href="#vision" className="hover:text-bmg-gold transition">About</a>
          <a href="#programme" className="hover:text-bmg-gold transition">Programme</a>
          <a href="#faculty" className="hover:text-bmg-gold transition">Faculty</a>
          <a href="#fundraising" className="hover:text-bmg-gold transition">Support</a>
          <a href="https://bernardimusicgroup.com/student-application/" target="_blank" rel="noopener noreferrer" className="hover:text-bmg-gold transition">Apply</a>
        </nav>
      </div>
    </header>
  )
}
