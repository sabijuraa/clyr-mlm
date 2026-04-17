-- Migration: Ensure legal_pages table exists with content
CREATE TABLE IF NOT EXISTS legal_pages (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    title_en VARCHAR(255),
    content_en TEXT,
    last_updated_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO legal_pages (page_key, title, content) VALUES 
('privacy', 'Datenschutzerklaerung', 'Wird geladen...'),
('imprint', 'Impressum', 'Wird geladen...'),
('terms', 'Allgemeine Geschaeftsbedingungen (AGB)', 'Wird geladen...'),
('withdrawal', 'Widerrufsbelehrung', 'Wird geladen...'),
('vp_vertrag', 'VP-Vertrag', 'Wird geladen...')
ON CONFLICT (page_key) DO NOTHING;

-- Ensure settings table exists
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
