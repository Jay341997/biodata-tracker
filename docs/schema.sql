CREATE TABLE biodata_profiles (
  id INTEGER PRIMARY KEY,
  source_file_name TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  uploaded_pdf_gzip_base64 TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  point_of_contact_name TEXT NOT NULL DEFAULT '',
  point_of_contact_phone TEXT NOT NULL DEFAULT '',
  age TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  working_location TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '',
  salary TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  profile_photo_data_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('new', 'called', 'follow_up', 'hold', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  hold_reason TEXT NOT NULL DEFAULT '',
  next_followup_at TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  extracted_text TEXT NOT NULL DEFAULT ''
);

CREATE TABLE interaction_logs (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES biodata_profiles (id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'message', 'note')),
  summary TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT '',
  next_action_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
