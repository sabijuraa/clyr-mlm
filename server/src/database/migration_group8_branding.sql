-- ============================================
-- CLYR MLM - Group 8 Migration
-- Admin Branding & CMS
-- ============================================

-- Branding table (#2, #3)
CREATE TABLE IF NOT EXISTS branding (
  id INTEGER PRIMARY KEY DEFAULT 1,
  logo_light_url VARCHAR(500),
  logo_dark_url VARCHAR(500),
  favicon_url VARCHAR(500),
  primary_color VARCHAR(20) DEFAULT '#0ea5e9',
  secondary_color VARCHAR(20) DEFAULT '#171717',
  accent_color VARCHAR(20) DEFAULT '#f59e0b',
  font_heading VARCHAR(100) DEFAULT 'Inter',
  font_body VARCHAR(100) DEFAULT 'Inter',
  facebook_url VARCHAR(500),
  instagram_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  twitter_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure default row
INSERT INTO branding (id, primary_color, secondary_color, accent_color)
VALUES (1, '#0ea5e9', '#171717', '#f59e0b')
ON CONFLICT (id) DO NOTHING;

-- FAQ table (#38)
CREATE TABLE IF NOT EXISTS faq_items (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  question_en TEXT,
  answer_en TEXT,
  category VARCHAR(100) DEFAULT 'allgemein',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed some default FAQ items
INSERT INTO faq_items (question, answer, category, sort_order) VALUES
  ('Was ist CLYR?', 'CLYR bietet Premium-Wasserfiltrationssysteme fuer reines, frisches Trinkwasser direkt aus Ihrem Wasserhahn. Unsere Produkte sind einfach zu installieren und bieten hoechste Filterqualitaet.', 'allgemein', 1),
  ('Wie installiere ich mein CLYR System?', 'Die Installation ist einfach und dauert nur wenige Minuten. Eine detaillierte Installationsanleitung wird mit jedem Produkt geliefert und steht auch in Ihrem Kundenbereich zum Download bereit.', 'produkte', 2),
  ('Wie oft muss der Filter gewechselt werden?', 'Wir empfehlen einen Filterwechsel alle 12 Monate. Mit unserem Filter-Abonnement erhalten Sie automatisch Ersatzfilter zur richtigen Zeit.', 'produkte', 3),
  ('In welche Laender liefern Sie?', 'Wir liefern aktuell nach Deutschland, Oesterreich und in die Schweiz. Die Versandkosten variieren je nach Land.', 'versand', 4),
  ('Wie kann ich Partner werden?', 'Sie koennen sich ueber unsere Partnerseite registrieren. Als Partner erhalten Sie attraktive Provisionen auf Ihre Verkaeufe und den Aufbau Ihres Teams.', 'partner', 5),
  ('Welche Zahlungsmethoden werden akzeptiert?', 'Wir akzeptieren Ueberweisung, Kreditkarte und PayPal. Alle Zahlungen werden sicher verarbeitet.', 'bestellung', 6),
  ('Kann ich meine Bestellung zurueckgeben?', 'Ja, Sie haben ein 14-taegiges Widerrufsrecht. Senden Sie die Ware innerhalb dieser Frist zurueck und erhalten eine volle Erstattung.', 'bestellung', 7)
ON CONFLICT DO NOTHING;

-- Legal pages table (#41)
CREATE TABLE IF NOT EXISTS legal_pages (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(50) UNIQUE NOT NULL, -- 'privacy', 'imprint', 'terms', 'withdrawal', 'vp_vertrag'
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  title_en VARCHAR(255),
  content_en TEXT,
  last_updated_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default legal pages
INSERT INTO legal_pages (page_key, title, content) VALUES
  ('privacy', 'Datenschutzerklaerung', 'Bitte bearbeiten Sie diese Seite im Admin-Bereich.'),
  ('imprint', 'Impressum', 'CLYR Solutions GmbH\nPappelweg 4b\n9524 St. Magdalen\nOesterreich\n\nE-Mail: service@clyr.shop\nGerichtsstand: Villach, Oesterreich'),
  ('terms', 'Allgemeine Geschaeftsbedingungen', 'Bitte bearbeiten Sie diese Seite im Admin-Bereich.'),
  ('withdrawal', 'Widerrufsbelehrung', 'Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gruenden diesen Vertrag zu widerrufen.'),
  ('vp_vertrag', 'VP-Vertrag', 'Bitte bearbeiten Sie diese Seite im Admin-Bereich.')
ON CONFLICT (page_key) DO NOTHING;

-- Cookie consent settings
INSERT INTO settings (key, value, description) VALUES
  ('cookie_banner_enabled', 'true', 'Cookie-Banner aktivieren'),
  ('cookie_banner_text', 'Diese Website verwendet Cookies, um Ihnen die bestmoegliche Nutzererfahrung zu bieten. Mit der Nutzung unserer Website stimmen Sie der Verwendung von Cookies zu.', 'Cookie-Banner Text')
ON CONFLICT (key) DO NOTHING;
