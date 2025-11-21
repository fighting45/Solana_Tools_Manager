import React, { useState } from "react";
import "./OptionalMetadata.css";

const OptionalMetadata = ({
  enabled,
  socialLinks,
  tags,
  onToggle,
  onSocialLinkChange,
  onTagChange,
  disabled,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (!enabled) {
      onToggle(true);
      setIsExpanded(true);
    } else {
      onToggle(false);
      setIsExpanded(false);
    }
  };

  return (
    <div className="optional-metadata-container">
      <div className="optional-metadata-header">
        <div className="optional-metadata-title-section">
          <h3 className="optional-metadata-title">
            🏷️ Social Links & Tags (Optional)
          </h3>
          <p className="optional-metadata-subtitle">
            Add social media links and tags to your token metadata
          </p>
        </div>
        <label className="optional-metadata-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={disabled}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {enabled && (
        <div className={`optional-metadata-content ${isExpanded ? "expanded" : ""}`}>
          {/* Social Links Section */}
          <div className="metadata-section">
            <h4 className="metadata-section-title">Social Links</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="telegramUrl" className="form-label">
                  <span className="social-icon">💬</span> Telegram URL
                </label>
                <input
                  type="text"
                  id="telegramUrl"
                  name="telegramUrl"
                  value={socialLinks.telegramUrl || ""}
                  onChange={onSocialLinkChange}
                  placeholder="https://t.me/yourgroup"
                  className="form-input"
                  disabled={disabled}
                />
              </div>
              <div className="form-group">
                <label htmlFor="websiteUrl" className="form-label">
                  <span className="social-icon">🌐</span> Website URL
                </label>
                <input
                  type="text"
                  id="websiteUrl"
                  name="websiteUrl"
                  value={socialLinks.websiteUrl || ""}
                  onChange={onSocialLinkChange}
                  placeholder="https://yourwebsite.com"
                  className="form-input"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="discordUrl" className="form-label">
                  <span className="social-icon">💬</span> Discord URL
                </label>
                <input
                  type="text"
                  id="discordUrl"
                  name="discordUrl"
                  value={socialLinks.discordUrl || ""}
                  onChange={onSocialLinkChange}
                  placeholder="https://discord.gg/yourinvite"
                  className="form-input"
                  disabled={disabled}
                />
              </div>
              <div className="form-group">
                <label htmlFor="twitterUrl" className="form-label">
                  <span className="social-icon">🐦</span> Twitter URL
                </label>
                <input
                  type="text"
                  id="twitterUrl"
                  name="twitterUrl"
                  value={socialLinks.twitterUrl || ""}
                  onChange={onSocialLinkChange}
                  placeholder="https://twitter.com/yourhandle"
                  className="form-input"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="metadata-section">
            <h4 className="metadata-section-title">Tags (Max 5)</h4>
            <div className="tags-grid">
              {[1, 2, 3, 4, 5].map((num) => (
                <input
                  key={num}
                  type="text"
                  name={`tag${num}`}
                  value={tags[`tag${num}`] || ""}
                  onChange={onTagChange}
                  placeholder={`Tag ${num}`}
                  className="tag-input"
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionalMetadata;
