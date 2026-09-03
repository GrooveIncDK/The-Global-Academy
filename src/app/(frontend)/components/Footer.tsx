import React from 'react'

export function Footer() {
  return (
    <footer id="contact">
      <div className="wrap">
        <img
          className="menu-divider"
          src="/images/menu-divider.png"
          alt=""
          style={{ marginBottom: 36 }}
        />
        <div className="footer-top">
          <div className="footer-col">
            <img src="/images/footer-logo.png" alt="The Global Academy" style={{ margin: '0 auto' }} />
          </div>
          <div className="footer-col">
            <p className="follow">Follow us</p>
            <div className="social-row">
              <a href="https://twitter.com/1globalacademy" aria-label="Twitter">
                𝕏
              </a>
              <a
                href="https://www.linkedin.com/company/global-academy-global-goals/"
                aria-label="LinkedIn"
              >
                in
              </a>
              <a href="https://www.facebook.com/GlobalAcademyGlobalGoals/" aria-label="Facebook">
                f
              </a>
              <a
                href="https://www.youtube.com/channel/UCoDbgOIN9qq2cqCJWVzedsw/videos"
                aria-label="YouTube"
              >
                ▶
              </a>
            </div>
          </div>
          <div className="footer-col">
            <ul>
              <li>
                <a href="/sitemap">Site Map</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-mid">
          <img className="badge" src="/images/seuk-badge.png" alt="Social Enterprise UK Certified" />
          <p>
            The Global Academy for Global Goals CIC is a social enterprise.
            <br />
            Registered in England and Wales, company number 11640862
            <br />
            First Floor Office, Salters Brothers Yard, Folly Bridge, Oxford OX1 4LB, UK
          </p>
          <img className="white-logo" src="/images/footer-logo-white.png" alt="The Global Academy" />
        </div>
        <div className="footer-powered-by">
          Powered by
          <a href="https://www.grooveinc.dk" target="_blank" rel="noopener noreferrer">
            <img src="/images/groove-logo.png" alt="Groove Inc" />
            <span>Groove Inc</span>
          </a>
        </div>
      </div>
      <div className="footer-bottom">The Global Academy for Global Goals CIC ©</div>
    </footer>
  )
}
