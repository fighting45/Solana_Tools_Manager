import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import './Homepage.css';

const Homepage = () => {
  return (
    <div className="homepage">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            The all-in-one solution for web3 creators
          </h1>
          <p className="hero-subtitle">
            Create and manage your Token & NFT, with ease and without code.
          </p>
          <Link to="/launch" className="launch-button">
            Launch App
            <span className="button-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">857+</div>
            <div className="stat-label">Tokens Created</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">109K+</div>
            <div className="stat-label">Total Volume</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">Launching a token from 0?</h2>
          <p className="section-description">
            It is normal that you think creating a web3 project is very complicated, but that's <strong>not the reality</strong>.
          </p>
          <p className="section-description">
            With ProgrammX you can launch your own token from <strong>only $100</strong>. Yes, including <strong>all the fees</strong> you need.
          </p>
          <p className="section-description">
            In fact there are hundreds of people launching their own tokens <strong>every day</strong> with our Solana Token Creator.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="services-container">
          <h2 className="section-title">Our Services</h2>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🪙</div>
              <h3 className="service-title">Token Creator</h3>
              <p className="service-description">
                Create SPL and Token-2022 tokens on Solana with ease
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">🔗</div>
              <h3 className="service-title">Blockchain Solutions</h3>
              <p className="service-description">
                Custom development for Solana, Ethereum, BSC, TON and more
              </p>
            </div>
            <div className="service-card">
              <div className="service-icon">👥</div>
              <h3 className="service-title">Expert Team</h3>
              <p className="service-description">
                Top developers ready to build your next project
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="contact-container">
          <h2 className="section-title">Get in Touch</h2>
          <p className="contact-description">
            For personalized Blockchain solutions on Solana, Ethereum, Binance Smart Chain, TON and other chains, contact us as we have top developers in action at ProgrammX
          </p>
          <div className="contact-links">
            <a 
              href="https://www.linkedin.com/company/programm-x/posts/?feedView=all" 
              target="_blank" 
              rel="noopener noreferrer"
              className="contact-link"
            >
              <span className="contact-icon">💼</span>
              LinkedIn
            </a>
            <a 
              href="https://programmx.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="contact-link"
            >
              <span className="contact-icon">🌐</span>
              Website
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-container">
          <p className="footer-text">
            Made with ❤️ by <span className="programmx-brand">ProgrammX</span>
          </p>
          <p className="footer-text-small">
            © 2025 ProgrammX | All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;

