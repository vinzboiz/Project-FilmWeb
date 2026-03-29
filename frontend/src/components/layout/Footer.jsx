import '../../styles/components/footer.css';

function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <span>© {new Date().getFullYear()} ThungPhim – Dự án học tập local.</span>
        <span>Backend: Node.js + Express + MySQL · Frontend: React + Vite</span>
      </div>
    </footer>
  );
}

export default Footer;

