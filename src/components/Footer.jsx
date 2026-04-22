export default function Footer() {
  return (
    <footer className="footer-container">
      <style>{`
        .footer-container {
          background-color: #f8f9fa;
          border-top: 1px solid #e0e0e0;
          margin-top: 60px;
          padding: 40px 20px;
          font-size: 14px;
          line-height: 1.6;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 30px;
        }

        .footer-section h3 {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          color: #333;
        }

        .footer-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-section li {
          margin-bottom: 8px;
        }

        .footer-section a {
          color: #0066cc;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-section a:hover {
          color: #0052a3;
          text-decoration: underline;
        }

        .footer-divider {
          border-top: 1px solid #e0e0e0;
          margin-top: 40px;
          padding-top: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }

        .footer-author {
          font-weight: 600;
          color: #333;
        }

        @media (max-width: 768px) {
          .footer-content {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>

      <div className="footer-content">
        <div className="footer-section">
          <h3>🧠 About This Tutorial</h3>
          <ul>
            <li><a href="/about/">About This Tutorial</a></li>
            <li><a href="/modules/module-01-tokens/">Start Learning</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>🔗 Resources</h3>
          <ul>
            <li><a href="https://arxiv.org/abs/2402.10260" target="_blank" rel="noopener noreferrer">StrongREJECT Paper</a></li>
            <li><a href="https://github.com/dsbowen/strong_reject" target="_blank" rel="noopener noreferrer">StrongREJECT Benchmark</a></li>
            <li><a href="https://ai.google.dev/gemma" target="_blank" rel="noopener noreferrer">Gemma Documentation</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>👤 Author</h3>
          <ul>
            <li><a href="https://www.linkedin.com/in/mondweepchakravorty/" target="_blank" rel="noopener noreferrer">LinkedIn Profile</a></li>
            <li><a href="https://github.com/mondweep/vibe-cast/tree/gemma-4b-abliterated-tinkering" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
            <li><a href="mailto:mondweep@dxsure.uk">Email</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-divider">
        <p>
          Created by <span className="footer-author">Mondweep Chakravorty</span> |
          AI Safety Research & Education |
          <a href="https://github.com/mondweep/vibe-cast/tree/gemma-4b-abliterated-tinkering" target="_blank" rel="noopener noreferrer"> GitHub</a>
        </p>
        <p style={{ marginTop: '8px' }}>
          © 2026 AI Safety Tutorial. Open-source research education.
        </p>
      </div>
    </footer>
  );
}
