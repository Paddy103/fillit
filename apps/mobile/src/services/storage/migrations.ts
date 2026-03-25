/**
 * SQLite schema migrations for the FillIt database.
 *
 * Each migration is an array of SQL statements applied in order.
 * Migrations are versioned starting at 1 and applied sequentially.
 * Once applied, a migration is never re-run.
 */

export interface Migration {
  version: number;
  statements: string[];
}

/**
 * Migration v1: Create all initial tables.
 *
 * Tables: profiles, addresses, identity_documents, professional_registrations,
 * emergency_contacts, documents, document_pages, detected_fields, signatures.
 */
const migrationV1: Migration = {
  version: 1,
  statements: [
    // ── Profiles ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      relationship TEXT,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      maiden_name TEXT,
      date_of_birth TEXT,
      gender TEXT,
      nationality TEXT DEFAULT 'South African',
      marital_status TEXT,
      sa_id_number_encrypted TEXT,
      citizenship TEXT,
      email TEXT,
      phone_mobile TEXT,
      phone_work TEXT,
      employer TEXT,
      job_title TEXT,
      work_phone TEXT,
      employee_number TEXT,
      industry TEXT,
      highest_qualification TEXT,
      institution TEXT,
      year_completed INTEGER,
      student_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // ── Addresses ─────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      street1 TEXT NOT NULL,
      street2 TEXT,
      suburb TEXT,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT DEFAULT 'South Africa',
      is_default INTEGER DEFAULT 0
    )`,

    `CREATE INDEX IF NOT EXISTS idx_addresses_profile_id ON addresses(profile_id)`,

    // ── Identity Documents ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS identity_documents (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      encrypted_number TEXT NOT NULL,
      issue_date TEXT,
      expiry_date TEXT,
      issuing_authority TEXT,
      additional_fields_encrypted TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_identity_documents_profile_id ON identity_documents(profile_id)`,

    // ── Professional Registrations ────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS professional_registrations (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      registration_number_encrypted TEXT NOT NULL,
      expiry_date TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_professional_registrations_profile_id ON professional_registrations(profile_id)`,

    // ── Emergency Contacts ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address_json TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_emergency_contacts_profile_id ON emergency_contacts(profile_id)`,

    // ── Documents ─────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      status TEXT NOT NULL,
      source_type TEXT NOT NULL,
      document_type TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      exported_pdf_uri TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`,

    // ── Document Pages ────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS document_pages (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      original_image_uri TEXT NOT NULL,
      processed_image_uri TEXT,
      ocr_text TEXT,
      width REAL,
      height REAL
    )`,

    `CREATE INDEX IF NOT EXISTS idx_document_pages_document_id ON document_pages(document_id)`,

    // ── Detected Fields ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS detected_fields (
      id TEXT PRIMARY KEY NOT NULL,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      page_id TEXT NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
      label TEXT,
      normalized_label TEXT,
      field_type TEXT NOT NULL,
      bounds_json TEXT NOT NULL,
      matched_profile_field TEXT,
      matched_profile_id TEXT,
      match_confidence REAL DEFAULT 0,
      value TEXT,
      original_value TEXT,
      is_confirmed INTEGER DEFAULT 0,
      is_signature_field INTEGER DEFAULT 0,
      signature_id TEXT
    )`,

    `CREATE INDEX IF NOT EXISTS idx_detected_fields_document_id ON detected_fields(document_id)`,
    `CREATE INDEX IF NOT EXISTS idx_detected_fields_page_id ON detected_fields(page_id)`,

    // ── Signatures ────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS signatures (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      label TEXT,
      image_uri TEXT,
      svg_path TEXT,
      text TEXT,
      font_family TEXT,
      created_at TEXT NOT NULL,
      is_default INTEGER DEFAULT 0
    )`,

    `CREATE INDEX IF NOT EXISTS idx_signatures_profile_id ON signatures(profile_id)`,
  ],
};

/** All migrations in order. Add new migrations to this array. */
export const migrations: Migration[] = [migrationV1];
